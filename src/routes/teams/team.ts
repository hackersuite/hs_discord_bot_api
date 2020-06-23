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
		try {
			const team = await this.api.controllers.team.getTeam(req.params.id);
			res.json({ team });
		} catch (err) {
			res.status(404);
		}
	}
}
