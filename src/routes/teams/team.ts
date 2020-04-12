import RouteHandler from '../../RouteHandler';
import HackathonAPI from '../../HackathonAPI';
import { Request, Response } from 'express';

export class TeamRoute implements RouteHandler {
	private readonly api: HackathonAPI;
	public constructor(api: HackathonAPI) {
		this.api = api;
	}

	public getRoute() {
		return '/teams/:id';
	}

	public async get(req: Request, res: Response) {
		const team = await this.api.controllers.team.getTeam(req.params.id);
		if (!team) res.status(404);
		res.json({ team });
	}
}
