import RouteHandler from '../../RouteHandler';
import HackathonAPI from '../../HackathonAPI';
import { Request, Response } from 'express';

interface PutBody {
	discordId: string;
	authId: string;
	full?: boolean;
}

export class UsersRoute implements RouteHandler {
	private readonly api: HackathonAPI;
	public constructor(api: HackathonAPI) {
		this.api = api;
	}

	public getRoute() {
		return '/users';
	}

	public async get(req: Request, res: Response) {
		const users = await this.api.controllers.user.getUsers();
		res.json({ users });
	}

	public async put(req: Request, res: Response) {
		const { discordId, authId, full } = req.body as PutBody;
		const user = await this.api.controllers.user.saveUser(discordId, authId);
		if (full === true) {
			return res.json({
				user: await this.api.controllers.user.getUser(discordId)
			});
		}
		res.json({
			user: {
				authId: user.authId,
				discordId: user.discordId
			}
		});
	}
}
