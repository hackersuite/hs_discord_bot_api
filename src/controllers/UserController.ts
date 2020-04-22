import * as auth from '@unicsmcr/hs_auth_client';
import HackathonAPI from '../HackathonAPI';
import { User } from '../entities/User';
import { DiscordResource } from '../entities/DiscordResource';

export interface APIUser {
	authId: string;
	discordId: string;
	authLevel: auth.AuthLevels;
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
			auth.getAllUsers(this.api.options.hsAuth.token)
		]);

		const authMap: Map<string, User> = new Map();
		for (const user of dbUsers) {
			authMap.set(user.authId, user);
		}

		const users = [];
		for (const user of authUsers) {
			const dbUser = authMap.get(user.authId);
			if (dbUser) {
				users.push(this.transformAuthUser(user, dbUser));
			}
		}
		return users;
	}

	public async getUser(discordId: string) {
		const [dbUser, authUsers] = await Promise.all([
			this.api.db.getRepository(User).findOne({
				where: { discordId },
				relations: ['roles']
			}),
			auth.getAllUsers(this.api.options.hsAuth.token)
		]);

		if (!dbUser || !authUsers) return;
		const targetId = dbUser.authId;

		for (const user of authUsers) {
			if (user.authId === targetId) {
				return this.transformAuthUser(user, dbUser);
			}
		}
	}

	public async getAuthUser(authId: string) {
		return (await auth.getAllUsers(this.api.options.hsAuth.token))
			.find(user => user.authId === authId);
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
				]
			});

			if (existing.length > 0) {
				await Promise.all(
					existing
						.filter(user => user.authId !== authId || user.discordId !== discordId)
						.map(user => repo.delete(user))
				);
			}

			const user = new User();
			user.discordId = discordId;
			user.authId = authId;
			user.roles = roles;

			return repo.save(user);
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

	private transformAuthUser(authUser: auth.RequestUser, dbUser: User): APIUser {
		return {
			authId: authUser.authId,
			discordId: dbUser.discordId,
			authLevel: authUser.authLevel,
			email: authUser.email,
			name: authUser.name,
			team: authUser.team,
			roles: dbUser.roles
		};
	}
}
