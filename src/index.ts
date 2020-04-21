import HackathonAPI, { HackathonAPIOptions } from './HackathonAPI';
import pino from 'pino';
import { config as loadEnv } from 'dotenv';

loadEnv();

function getEnv(name: string) {
	const val = process.env[name];
	if (typeof val === 'undefined') {
		throw new Error(`Environment variable '${name}' is unset`);
	}
	return val;
}

const baseLogger = pino();

const config: HackathonAPIOptions = {
	db: {
		host: getEnv('DB_HOST'),
		port: Number(getEnv('DB_PORT')),
		username: getEnv('DB_USERNAME'),
		password: getEnv('DB_PASSWORD'),
		database: getEnv('DB_DATABASE'),
		type: 'mysql'
	},
	api: {
		port: Number(getEnv('PORT'))
	},
	discord: {
		clientId: getEnv('DISCORD_CLIENT_ID'),
		clientSecret: getEnv('DISCORD_CLIENT_SECRET'),
		botToken: getEnv('DISCORD_BOT_TOKEN'),
		guildId: getEnv('DISCORD_GUILD_ID'),
		redirectUri: getEnv('DISCORD_REDIRECT_URI'),
		hmacKey: getEnv('HMAC_KEY')
	},
	hsAuth: {
		token: getEnv('HS_AUTH_TOKEN'),
		url: getEnv('HS_AUTH_URL')
	},
	loggers: {
		base: baseLogger,
		api: baseLogger.child({ name: 'api' })
	}
};

// For hs_auth_client
process.env.AUTH_URL = getEnv('HS_AUTH_URL');

const apiServer = new HackathonAPI(config);
apiServer.start()
	.catch(console.log);
