import HackathonAPI, { HackathonAPIOptions } from './HackathonAPI';
import * as pino from 'pino';
const config = require('../data/config.json') as HackathonAPIOptions;

const baseLogger = pino();
config.loggers = {
	base: baseLogger,
	api: baseLogger.child({ name: 'api' })
};

process.env.AUTH_URL = config.hsAuth.url;

const apiServer = new HackathonAPI(config);
apiServer.start()
	.catch(console.log);
