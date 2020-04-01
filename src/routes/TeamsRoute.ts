import RouteHandler from '../RouteHandler';
import HackathonAPI from '../HackathonAPI';
import { Request, Response } from 'express';

export class TeamsRoute implements RouteHandler {
	private readonly api: HackathonAPI;
	public constructor(api: HackathonAPI) {
		this.api = api;
	}

	public getRoute() {
		return '/teams';
	}

	public async get(req: Request, res: Response) {
		const teams = await this.api.controllers.team.getTeams();
		res.json({ teams });
	}
}
