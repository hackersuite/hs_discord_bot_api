import { Request, Response } from 'express';

export type ExpressHandler = (req: Request, res: Response) => void;

export default interface RouteHandler {
	getRoute(): string;
	get?: ExpressHandler;
	put?: ExpressHandler;
	post?: ExpressHandler;
	patch?: ExpressHandler;
	delete?: ExpressHandler;
}
