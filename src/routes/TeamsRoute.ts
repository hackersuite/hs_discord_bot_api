import RouteHandler from '../RouteHandler';
import HackathonAPI from '../HackathonAPI';
import { Request, Response } from 'express';

interface PutBody {
	authId: string;
	full?: boolean;
}

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

	public async put(req: Request, res: Response) {
		const { authId, full } = req.body as PutBody;
		const team = await this.api.controllers.team.putTeam(authId);
		if (full === true) {
			/*
			todo
			return res.json({
				team: await this.api.controllers.team.getTeam(authId);
			});
			*/
		}
		res.json({
			team: {
				authId: team.authId
			}
		});
	}
}
