import RouteHandler from '../../RouteHandler';
import HackathonAPI from '../../HackathonAPI';
import { Request, Response } from 'express';

export class UserSyncRoute implements RouteHandler {
	private readonly api: HackathonAPI;
	public constructor(api: HackathonAPI) {
		this.api = api;
	}

	public getRoute() {
		return '/users/:id/sync';
	}

	public async put(req: Request, res: Response) {
		const discordId: string = req.params.id;
		await this.api.controllers.discord.oauth2.syncMember(discordId);
		res.json({ message: 'ok' });
	}
}
