import * as auth from '@unicsmcr/hs_auth_client';
import HackathonAPI from '../HackathonAPI';
import { User } from '../entities/User';

export interface APIUser {
	authId: string;
	discordId: string;
	authLevel: auth.AuthLevels;
	email: string;
	name: string;
	team?: string;
}

export default class UserController {
	private readonly api: HackathonAPI;

	public constructor(api: HackathonAPI) {
		this.api = api;
	}

	public async getUsers() {
		const db = this.getDB();

		const [dbUsers, authUsers] = await Promise.all([
			db.getRepository(User).find(),
			auth.getAllUsers(this.api.options.hsAuth.token)
		]);

		const discordIds: Map<string, string> = new Map();
		for (const user of dbUsers) {
			discordIds.set(user.authId, user.discordId);
		}

		const users = [];
		for (const user of authUsers) {
			const discordId = discordIds.get(user.authId);
			if (discordId) {
				users.push(this.transformAuthUser(user, discordId));
			}
		}
		return users;
	}

	public async getUser(discordId: string) {
		const db = this.getDB();

		const [dbUsers, authUsers] = await Promise.all([
			db.getRepository(User).find(),
			auth.getAllUsers(this.api.options.hsAuth.token)
		]);

		let targetId = null;
		for (const user of dbUsers) {
			if (user.discordId === discordId) {
				targetId = user.authId;
				break;
			}
		}
		if (!targetId) return null;

		for (const user of authUsers) {
			if (user.authId === targetId) {
				return this.transformAuthUser(user, discordId);
			}
		}
	}

	/**
	 * Will save a discord <-> hs_auth relationship in users table
	 * If a relationship exists already involving either the discordId or authId, it will be destroyed.
	 */
	public async saveUser(discordId: string, authId: string) {
		return this.getDB().transaction(async manager => {
			const repo = manager.getRepository(User);
			const existing = await repo.find({
				where: [
					{ authId },
					{ discordId }
				]
			});

			if (existing.length > 0) {
				await Promise.all(
					existing.map(user => repo.delete(user))
				);
			}

			const user = new User();
			user.discordId = discordId;
			user.authId = authId;

			return repo.save(user);
		});
	}

	public async deleteUser(discordId: string) {
		return this.getDB().getRepository(User).delete({ discordId });
	}

	private transformAuthUser(user: auth.RequestUser, discordId: string): APIUser {
		return {
			authId: user.authId,
			discordId,
			authLevel: user.authLevel,
			email: user.email,
			name: user.name,
			team: user.team
		};
	}

	private getDB() {
		if (!this.api.db) {
			throw new Error('No database!');
		}
		return this.api.db;
	}
}
