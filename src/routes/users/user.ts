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
		try {
			const user = await this.api.controllers.user.getUser(req.params.id);
			res.json({ user });
		} catch (err) {
			res.status(404);
		}
	}

	public async delete(req: Request, res: Response) {
		await this.api.controllers.user.deleteUser(req.params.id);
		res.json({});
	}
}
