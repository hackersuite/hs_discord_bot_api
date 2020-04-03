import HackathonAPI from '../HackathonAPI';
import { createHmac } from 'crypto';
import axios from 'axios';
import { stringify } from 'querystring';
import { Rest, TokenType } from '@spectacles/rest';
import { Agent } from 'https';

const API_BASE = 'https://discordapp.com/api/v6';

interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
}

// not a full user, only properties we're interested in
// see https://discordapp.com/developers/docs/resources/user#user-object
interface DiscordUser {
	id: string;
	locale: string;
}

export interface APITeam {
	authId: string;
	name: string;
	creator: string;
	teamNumber: number;
}

export class DiscordController {
	private readonly api: HackathonAPI;
	private readonly rest: Rest;
	private readonly agent: Agent;

	public constructor(api: HackathonAPI) {
		this.api = api;
		this.agent = new Agent({ keepAlive: true });
		this.rest = new Rest(api.options.discord.botToken, { agent: this.agent });
	}

	public async processOAuth2(code: string, state: string) {
		const authId = this.validateState(state);
		const accessToken = await this.getAccessToken(code);
		const user = await this.fetchUserDetails(accessToken);
		await this.api.controllers.user.saveUser(user.id, authId);
		await this.addUserToGuild(accessToken, user.id);
	}

	private async fetchUserDetails(accessToken: string) {
		const client = new Rest(accessToken, {
			tokenType: TokenType.BEARER,
			agent: this.agent
		});
		return await client.get(`/users/@me`) as DiscordUser;
	}

	private addUserToGuild(accessToken: string, userId: string) {
		return this.rest.put(`/guilds/${this.api.options.discord.guildId}/members/${userId}`, {
			access_token: accessToken
		});
	}

	private async getAccessToken(code: string) {
		const res = await axios.post(`${API_BASE}/oauth2/token`, stringify({
			client_id: this.api.options.discord.clientId,
			client_secret: this.api.options.discord.clientSecret,
			grant_type: 'authorization_code',
			code,
			redirect_uri: this.api.options.discord.redirectUri,
			scope: 'identify guilds.join'
		}), { httpsAgent: this.agent });
		const data = res.data as TokenResponse;
		return data.access_token;
	}

	/**
	 * Validates the state given back to us by Discord. This is done to check that it actually
	 * comes from the hs system, and not some 3rd party. The state given is base64-encoded.
	 * When decoded, it contains the authId and an hmac of the authId joined by a colon.
	 * If the hmac is deemed to be valid, then this will return the authId, otherwise an
	 * error will be thrown.
	 */
	private validateState(state: string) {
		const [authId, givenHash] = Buffer.from(state, 'base64').toString('utf8').split(':');
		if (!authId || !givenHash) throw new Error('Invalid state');
		const hash = createHmac('sha256', this.api.options.discord.hmacKey)
			.update(authId)
			.digest('base64');
		if (hash !== givenHash) throw new Error('State is not authentic');
		return authId;
	}
}
