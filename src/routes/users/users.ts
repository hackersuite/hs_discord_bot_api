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
}
