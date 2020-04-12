import RouteHandler from '../../RouteHandler';
import HackathonAPI from '../../HackathonAPI';
import { Request, Response } from 'express';

interface PutBody {
	authId: string;
	full?: boolean;
}

export class DiscordResourcesRoute implements RouteHandler {
	private readonly api: HackathonAPI;
	public constructor(api: HackathonAPI) {
		this.api = api;
	}

	public getRoute() {
		return '/discord/resources/:name';
	}

	public async get(req: Request, res: Response) {
		const discordId = await this.api.controllers.discord.resources.getId(req.params.name);
		if (!discordId) res.status(404);
		res.json({ discordId, name: req.params.name });
	}
}
