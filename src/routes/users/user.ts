import RouteHandler from '../../RouteHandler';
import HackathonAPI from '../../HackathonAPI';
import { Request, Response } from 'express';

export class UserRoute implements RouteHandler {
	private readonly api: HackathonAPI;
	public constructor(api: HackathonAPI) {
		this.api = api;
	}

	public getRoute() {
		return '/users/:id';
	}

	public async get(req: Request, res: Response) {
		const user = await this.api.controllers.user.getUser(req.params.id);
		if (!user) res.status(404);
		res.json({ user });
	}

	public async delete(req: Request, res: Response) {
		await this.api.controllers.user.deleteUser(req.params.id);
		res.json({});
	}
}
