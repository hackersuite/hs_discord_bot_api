import RouteHandler from '../../RouteHandler';
import HackathonAPI from '../../HackathonAPI';
import { Request, Response } from 'express';

interface QueryParams {
	code?: string;
	state?: string;
}

export class DiscordSetupRoute implements RouteHandler {
	private readonly api: HackathonAPI;
	private busy: boolean;
	public constructor(api: HackathonAPI) {
		this.api = api;
		this.busy = false;
	}

	public getRoute() {
		return '/discord/setup';
	}

	public async put(req: Request, res: Response) {
		if (this.busy) {
			return res.status(500).json({ message: 'Busy' });
		}
		this.busy = true;
		try {
			await this.api.controllers.discord.roles.ensureBasicRoles();
			await this.api.controllers.discord.channels.ensureChannels();
		} catch (err) {
			this.busy = false;
			throw err;
		}
		this.busy = false;
		res.json({ message: 'ok' });
	}
}
