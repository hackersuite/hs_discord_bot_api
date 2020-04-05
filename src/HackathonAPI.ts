import 'reflect-metadata';
import express from 'express';
import { UserController, TeamController, DiscordController } from './controllers';
import RouteHandler, { ExpressHandler } from './RouteHandler';
import * as routes from './routes';
import { createConnection, ConnectionOptions, Connection } from 'typeorm';
import { User } from './entities/User';
import { Team } from './entities/Team';
import { DiscordResource } from './entities/DiscordResource';
import pino from 'pino';

export interface HackathonAPIOptions {
	api: {
		port: number;
	};
	hsAuth: {
		url: string;
		token: string;
	};
	db: ConnectionOptions;
	loggers: {
		base: pino.Logger;
		api: pino.Logger;
	};
	discord: {
		hmacKey: string;
		clientId: string;
		clientSecret: string;
		redirectUri: string;
		guildId: string;
		botToken: string;
	};
}

interface Controllers {
	user: UserController;
	team: TeamController;
	discord: DiscordController;
}

const VERBS: (keyof express.Router & keyof RouteHandler)[] = [
	'get',
	'put',
	'post',
	'patch',
	'delete'
];

export default class HackathonAPI {
	public readonly options: HackathonAPIOptions;
	public readonly express: express.Application;
	private readonly router: express.Router;
	public readonly controllers: Controllers;
	public db!: Connection;
	private readonly handlers: RouteHandler[];

	public constructor(options: HackathonAPIOptions) {
		this.options = options;

		this.controllers = {
			user: new UserController(this),
			team: new TeamController(this),
			discord: new DiscordController(this)
		};

		this.handlers = [];

		this.express = express();
		this.router = express.Router();
		this.express.use('/api/v1', this.router);
	}

	public async start() {
		this.options.loggers.base.info('Starting Hackathon API server...');
		this.db = await createConnection({
			...this.options.db,
			entities: [User, Team, DiscordResource],
			logging: false,
			synchronize: true
		});
		this.options.loggers.base.info('Connected to database');
		await this.configureExpress();
		this.options.loggers.base.info(`Listening on http://localhost:${this.options.api.port}/api/v1`);
	}

	private configureExpress() {
		return new Promise((resolve, reject) => {
			this.router.use(express.json());
			for (const Route of Object.values(routes)) {
				this.addRoute(new Route(this));
			}
			this.express.listen(this.options.api.port, resolve);
			this.express.on('error', err => {
				reject(err);
				this.options.loggers.base.error(err);
			});
		});
	}

	private addRoute(handler: RouteHandler) {
		this.handlers.push(handler);
		const path = handler.getRoute();
		for (const verb of VERBS) {
			const fn = handler[verb];
			this.options.loggers.api.info(`Registered ${verb.toUpperCase()} ${handler.getRoute()}`);
			if (fn) this.router[verb](path, this.wrapHandler(fn.bind(handler)));
		}
	}

	private wrapHandler(handler: ExpressHandler) {
		return (req: express.Request, res: express.Response) => this.execRoute(req, res, handler);
	}

	private async execRoute(req: express.Request, res: express.Response, handler: ExpressHandler) {
		const time = Date.now();
		try {
			await handler(req, res);
			this.options.loggers.api.info({
				method: req.method,
				route: req.url,
				status: res.statusCode,
				timeTaken: Date.now() - time
			});
		} catch (error) {
			const id = Date.now();
			res.status(500).json({ error: `A server error occurred (id: ${id})` });
			this.options.loggers.api.error({
				method: req.method,
				route: req.url,
				status: res.statusCode,
				error: error.stack,
				id,
				timeTaken: id - time
			});
		}
	}
}
