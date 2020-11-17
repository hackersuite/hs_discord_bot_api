import * as auth from '@unicsmcr/hs_auth_client';
import HackathonAPI from '../HackathonAPI';
import { User } from '../entities/User';
import { DiscordResource } from '../entities/DiscordResource';
import { authClient } from '../utils/AuthClient';

export interface APIUser {
	authId: string;
	discordId: string;
	email: string;
	name: string;
	team?: string;
	roles: DiscordResource[];
}

export class UserController {
	private readonly api: HackathonAPI;

	public constructor(api: HackathonAPI) {
		this.api = api;
	}

	public async getUsers() {
		const [dbUsers, authUsers] = await Promise.all([
			this.api.db.getRepository(User).find({ relations: ['roles'] }),
			authClient.getUsers(this.api.options.hsAuth.token)
		]);

		const authMap: Map<string, User> = new Map();
		for (const user of dbUsers) {
			authMap.set(user.authId, user);
		}

		const users = [];
		for (const user of authUsers) {
			const dbUser = authMap.get(user.id);
			if (dbUser) {
				users.push(this.transformAuthUser(user, dbUser));
			}
		}
		return users;
	}

	public async getUser(discordId: string) {
		const [dbUser, authUsers] = await Promise.all([
			this.api.db.getRepository(User).findOneOrFail({
				where: { discordId },
				relations: ['roles']
			}),
			authClient.getUsers(this.api.options.hsAuth.token)
		]);

		const targetId = dbUser.authId;

		for (const user of authUsers) {
			if (user.id === targetId) {
				return this.transformAuthUser(user, dbUser);
			}
		}
		throw new Error(`User ${targetId} not found`);
	}

	public async getAuthUser(authId: string) {
		return (await authClient.getUsers(this.api.options.hsAuth.token))
			.find(user => user.id === authId);
	}

	public async getAuthUserOrFail(authId: string) {
		const user = await this.getAuthUser(authId);
		if (!user) throw new Error(`User ${authId} not found on auth system!`);
		return user;
	}

	/**
	 * Will save a discord <-> hs_auth relationship in users table
	 * If a relationship exists already involving either the discordId or authId, it will be destroyed.
	 */
	public async saveUser(discordId: string, authId: string, roles: DiscordResource[]) {
		return this.api.db.transaction(async manager => {
			const repo = manager.getRepository(User);
			const existing = await repo.find({
				where: [
					{ authId },
					{ discordId }
				],
				relations: ['roles']
			});

			const refreshUser = existing.find(user => user.authId === authId && user.discordId === discordId);
			if (refreshUser) {
				// We are just updating roles here, copy the roles given to us first
				const newRoles = [...roles];
				// Now copy over relevant roles from existing relation
				for (const existingRole of refreshUser.roles) {
					// Any auth roles and team roles should be ignored, copy everything else
					if (!['role.organiser', 'role.volunteer', 'role.attendee'].includes(existingRole.name) &&
						!existingRole.name.startsWith('role.teams')) {
						newRoles.push(existingRole);
					}
				}
				// Save these roles
				refreshUser.roles = newRoles;
				return manager.save(refreshUser);
			}

			if (existing.length > 0) {
				await manager.delete(User, existing.map(user => user.discordId));
			}

			const user = new User();
			user.discordId = discordId;
			user.authId = authId;
			user.roles = roles;

			return manager.save(user);
		});
	}

	public async deleteUser(discordId: string) {
		return this.api.db.getRepository(User).delete({ discordId });
	}

	public async addRoles(discordId: string, roles: string[]) {
		const userRepo = this.api.db.getRepository(User);
		const user = await userRepo.findOneOrFail({
			where: {
				discordId
			},
			relations: ['roles']
		});
		const nextRoles = user.roles.map(role => role.name).concat(roles);
		const mappedRoles = (await this.api.db.getRepository(DiscordResource).find())
			.filter(res => nextRoles.includes(res.name));
		user.roles = mappedRoles;
		await this.setUserRoles(discordId, user.roles.map(role => role.discordId));
		return userRepo.save(user);
	}

	public async setRoles(discordId: string, roles: string[]) {
		const userRepo = this.api.db.getRepository(User);
		const user = await userRepo.findOneOrFail({
			where: {
				discordId
			}
		});
		const mappedRoles = (await this.api.db.getRepository(DiscordResource).find())
			.filter(res => roles.includes(res.name));
		user.roles = mappedRoles;
		await this.setUserRoles(discordId, user.roles.map(role => role.discordId));
		return userRepo.save(user);
	}

	public async removeRoles(discordId: string, roles: string[]) {
		const userRepo = this.api.db.getRepository(User);
		const user = await userRepo.findOneOrFail({
			where: {
				discordId
			},
			relations: ['roles']
		});
		user.roles = user.roles.filter(role => !roles.includes(role.name));
		await this.setUserRoles(discordId, user.roles.map(role => role.discordId));
		return userRepo.save(user);
	}

	private async setUserRoles(discordId: string, roles: string[]) {
		const rest = this.api.controllers.discord.rest;
		return rest.patch(`/guilds/${this.api.options.discord.guildId}/members/${discordId}`, {
			roles
		});
	}

	private transformAuthUser(authUser: auth.User, dbUser: User): APIUser {
		return {
			authId: authUser.id,
			discordId: dbUser.discordId,
			email: authUser.email,
			name: authUser.name,
			team: authUser.team,
			roles: dbUser.roles
		};
	}
}
