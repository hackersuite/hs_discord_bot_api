import { DiscordController } from '../DiscordController';
import { DiscordUser } from '../../utils/DiscordConstants';
import { AuthLevels } from '@unicsmcr/hs_auth_client';
import { Rest, TokenType } from '@spectacles/rest';
import { stringify } from 'querystring';
import axios from 'axios';
import { createHmac } from 'crypto';
import { DiscordResource } from '../../entities/DiscordResource';

interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
}

export class OAuth2Controller {
	private readonly parent: DiscordController;

	public constructor(parent: DiscordController) {
		this.parent = parent;
	}

	private get guildId() {
		return this.parent.api.options.discord.guildId;
	}

	private get api() {
		return this.parent.api;
	}

	private get rest() {
		return this.parent.rest;
	}

	public async processOAuth2(code: string, state: string) {
		// Validate and get the user's Auth ID
		const authId = this.validateState(state);
		const authUser = await this.api.controllers.user.getAuthUser(authId);
		if (!authUser) throw new Error('No auth user!');
		// Swap the OAuth2 code for an access token
		const accessToken = await this.getAccessToken(code);
		// Fetch the details of the user's Discord account using the token
		const discordUser = await this.fetchUserDetails(accessToken);

		// Create an array for the roles the user should have, starting with their auth level
		const roles = [await this.getAuthRole(authUser.authLevel)];

		// If the user is in a team
		if (authUser.team) {
			// Link their team to the database
			await this.api.controllers.team.putTeam(authUser.team);
			// Fetch the hs_auth details about the team
			const team = await this.api.controllers.team.getTeam(authUser.team);
			if (!team) throw new Error('Team was not saved properly!');
			// Ensure that the user's team has their roles and channels created
			await this.parent.ensureTeamState(team);
			// Add the team's role to the roles list
			roles.push(await this.parent.resources.getOrFail(`role.teams.${team.teamNumber}`));
		}

		// Link the Discord account to the Auth ID
		await this.api.controllers.user.saveUser(discordUser.id, authId, roles);

		const res = await this.addUserToGuild(accessToken, discordUser.id, roles.map(role => role.discordId));
		// If the user is already a member of the guild, then we get an empty response
		if (!res.user) {
			await this.patchMember(discordUser.id, { roles: roles.map(role => role.discordId) });
		}
	}

	private async patchMember(userId: string, data: object) {
		return this.rest.patch(`/guilds/${this.api.options.discord.guildId}/members/${userId}`, data);
	}

	private async getAuthRole(level: AuthLevels): Promise<DiscordResource> {
		if (level === AuthLevels.Organiser) {
			return this.parent.resources.getOrFail('role.organiser');
		} else if (level === AuthLevels.Volunteer) {
			return this.parent.resources.getOrFail('role.volunteer');
		} else if (level === AuthLevels.Attendee) {
			return this.parent.resources.getOrFail('role.attendee');
		}
		throw new Error(`No role for level ${level}`);
	}

	private async fetchUserDetails(accessToken: string) {
		const client = new Rest(accessToken, {
			tokenType: TokenType.BEARER
		});
		return await client.get(`/users/@me`) as DiscordUser;
	}

	private addUserToGuild(accessToken: string, userId: string, roles: string[]) {
		return this.rest.put(`/guilds/${this.api.options.discord.guildId}/members/${userId}`, {
			access_token: accessToken,
			roles
		});
	}

	private async getAccessToken(code: string) {
		const res = await axios.post(`https://discordapp.com/api/v6/oauth2/token`, stringify({
			client_id: this.api.options.discord.clientId,
			client_secret: this.api.options.discord.clientSecret,
			grant_type: 'authorization_code',
			code,
			redirect_uri: this.api.options.discord.redirectUri,
			scope: 'identify guilds.join'
		}));
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
