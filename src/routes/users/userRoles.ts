import RouteHandler from '../../RouteHandler';
import HackathonAPI from '../../HackathonAPI';
import { Request, Response } from 'express';

interface EditPayload {
	method: 'add' | 'set' | 'remove';
	roles: string[];
}

export class UserRolesRoute implements RouteHandler {
	private readonly api: HackathonAPI;
	public constructor(api: HackathonAPI) {
		this.api = api;
	}

	public getRoute() {
		return '/users/:id/roles';
	}

	public async put(req: Request, res: Response) {
		const body = req.body as EditPayload;
		if (body.method === 'add') {
			res.json({
				user: await this.api.controllers.user.addRoles(req.params.id, body.roles)
			});
		} else if (body.method === 'set') {
			res.json({
				user: await this.api.controllers.user.setRoles(req.params.id, body.roles)
			});
		} else if (body.method === 'remove') {
			res.json({
				user: await this.api.controllers.user.removeRoles(req.params.id, body.roles)
			});
		}
	}
}
