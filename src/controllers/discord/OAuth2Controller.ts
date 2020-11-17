import { DiscordController } from '../DiscordController';
import { DiscordUser } from '../../utils/DiscordConstants';
import { User } from '@unicsmcr/hs_auth_client';
import { Rest, TokenType } from '@spectacles/rest';
import { stringify } from 'querystring';
import axios from 'axios';
import { createHmac } from 'crypto';
import { DiscordResource } from '../../entities/DiscordResource';
import WrappedError from '../../utils/WrappedError';
import { authClient } from '../../utils/AuthClient';

function wrapError<T>(promise: Promise<T>, message: string): Promise<T> {
	return promise.catch(error => Promise.reject(new WrappedError(message, error)));
}

interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
}

enum DiscordRoleURI {
	Organiser = 'hs:hs_discord:guild:organiser',
	Volunteer = 'hs:hs_discord:guild:volunteer',
	Attendee = 'hs:hs_discord:guild:attendee'
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
		// Swap the OAuth2 code for an access token
		const accessToken = await wrapError(this.getAccessToken(code), 'Error retrieving access token');
		// Fetch the details of the user's Discord account using the token
		const discordUser = await wrapError(this.fetchUserDetails(accessToken), 'Error fetching data from Discord');
		return this.syncMemberState(authId, discordUser, accessToken);
	}

	public async syncMember(discordId: string) {
		const authId = (await wrapError(this.api.controllers.user.getUser(discordId), `Failed to fetch user for discord id ${discordId}`)).authId;
		const discordUser = await wrapError(this.fetchDiscordUser(discordId), `Failed to fetch ${discordId} from Discord`);
		return this.syncMemberState(authId, discordUser);
	}

	private async syncMemberState(authId: string, discordUser: DiscordUser, accessToken?: string) {
		const authUser = await wrapError(this.api.controllers.user.getAuthUserOrFail(authId),
			`Error retrieving user ${authId} on auth system`);
		// Create an array for the roles the user should have, starting with their auth level
		const roles = [await wrapError(this.getAccessLevelRole(authUser),
			`Unable to find the Discord role for auth user ${authUser.id}`)];

		// If the user is in a team
		if (authUser.team) {
			// Link their team to the database
			await wrapError(this.api.controllers.team.putTeam(authUser.team),
				`Failed to register team (Team ID: ${authUser.team})`);

			// Fetch the hs_auth details about the team
			const team = await wrapError(this.api.controllers.team.getTeam(authUser.team),
				`Error fetching team ${authUser.team} - is it linked?`);

			// Ensure that the user's team has their roles and channels created
			await wrapError(this.parent.ensureTeamState(team), `Error creating team ${authUser.team} channels/roles`);
			// Add the team's role to the roles list
			roles.push(await this.parent.resources.getOrFail(`role.teams.${team.teamNumber}`));
		}

		// Link the Discord account to the Auth ID
		const user = await wrapError(this.api.controllers.user.saveUser(discordUser.id, authId, roles),
			'Unable to finalise account link');

		const res = accessToken
			? await wrapError(
				this.addUserToGuild(accessToken, discordUser.id, user.roles.map(role => role.discordId)),
				'An error occurred when trying to add you to the Hackathon server'
			)
			: {};
		// If the user is already a member of the guild, then we get an empty response
		if (!res.user) {
			await wrapError(
				this.patchMember(discordUser.id, { roles: user.roles.map(role => role.discordId) }),
				'An error occurred when trying to update your roles on the Hackathon server'
			);
		}
	}

	private async patchMember(userId: string, data: Record<string, any>) {
		return this.rest.patch(`/guilds/${this.api.options.discord.guildId}/members/${userId}`, data);
	}

	/**
	 * Gets the access level Discord role for an auth user (e.g. organiser, volunteer etc.) that dictates
	 * which channels they are able to see and type in
	 * @param user The user to get the access level role of
	 */
	private async getAccessLevelRole(user: User): Promise<DiscordResource> {
		const resources = await authClient.getAuthorizedResources(this.api.options.hsAuth.token, Object.values(DiscordRoleURI), user.id);

		if (resources.includes(DiscordRoleURI.Organiser)) {
			return this.parent.resources.getOrFail('role.organiser');
		} else if (resources.includes(DiscordRoleURI.Volunteer)) {
			return this.parent.resources.getOrFail('role.volunteer');
		} else if (resources.includes(DiscordRoleURI.Attendee)) {
			return this.parent.resources.getOrFail('role.attendee');
		}
		throw new Error(`No role for user ${user.id}`);
	}

	private async fetchUserDetails(accessToken: string) {
		const client = new Rest(accessToken, {
			tokenType: TokenType.BEARER
		});
		return await client.get(`/users/@me`) as DiscordUser;
	}

	private async fetchDiscordUser(discordId: string): Promise<DiscordUser> {
		return await this.rest.get(`/users/${discordId}`) as DiscordUser;
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
