import RouteHandler from '../../RouteHandler';
import HackathonAPI from '../../HackathonAPI';
import { Request, Response } from 'express';

interface QueryParams {
	code?: string;
	state?: string;
}

export class DiscordOAuth2VerifyRoute implements RouteHandler {
	private readonly api: HackathonAPI;
	public constructor(api: HackathonAPI) {
		this.api = api;
	}

	public getRoute() {
		return '/discord/verify';
	}

	public async get(req: Request, res: Response) {
		const { code, state } = req.query as QueryParams;
		if (!code || !state) return res.status(400).json({ message: 'Missing query parameters' });
		await this.api.controllers.discord.processOAuth2(code, state);
		res.json({ message: 'ok' });
	}
}
