import HackathonAPI from '../HackathonAPI';
import { createHmac } from 'crypto';
import axios from 'axios';
import { stringify } from 'querystring';
import { Rest, TokenType } from '@spectacles/rest';
import { Agent } from 'https';
import { DiscordResource } from '../entities/DiscordResource';
import { CreateGuildRoleData, CreateGuildChannelData, HasId, DiscordUser } from '../utils/DiscordConstants';
import { AuthLevels } from '@unicsmcr/hs_auth_client';
import * as templates from '../templates';

const API_BASE = 'https://discordapp.com/api/v6';

interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
}

export interface AuthTeam {
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
		// Validate and get the user's Auth ID
		const authId = this.validateState(state);
		// Swap the OAuth2 code for an access token
		const accessToken = await this.getAccessToken(code);
		// Fetch the details of the user's Discord account using the token
		const discordUser = await this.fetchUserDetails(accessToken);
		// Link the Discord account to the Auth ID
		await this.api.controllers.user.saveUser(discordUser.id, authId);

		// Fetch all the hs_auth details of the user
		const apiUser = await this.api.controllers.user.getUser(discordUser.id);
		if (!apiUser) throw new Error('No auth user!');

		// Create an array for the roles the user should have, starting with their auth level
		const roles = [await this.getAuthRole(apiUser.authLevel)];

		// If the user is in a team
		if (apiUser.team) {
			// Link their team to the database
			await this.api.controllers.team.putTeam(apiUser.team);
			// Fetch the hs_auth details about the team
			const team = await this.api.controllers.team.getTeam(apiUser.team);
			if (!team) throw new Error('Team was not saved properly!');
			// Ensure that the user's team has their roles and channels created
			await this.ensureTeamState(team);
			// Add the team's role to the roles list
			roles.push(await this.getResourceOrFail(`role.teams.${team.teamNumber}`));
		}
		const res = await this.addUserToGuild(accessToken, discordUser.id, roles);
		// If the user is already a member of the guild, then we get an empty response
		if (!res.user) {
			await this.patchMember(discordUser.id, { roles });
		}
	}

	private async patchMember(userId: string, data: object) {
		return this.rest.patch(`/guilds/${this.api.options.discord.guildId}/members/${userId}`, data);
	}

	private async getAuthRole(level: AuthLevels) {
		if (level === AuthLevels.Organiser) {
			return this.getResourceOrFail('role.organiser');
		} else if (level === AuthLevels.Volunteer) {
			return this.getResourceOrFail('role.volunteer');
		} else if (level === AuthLevels.Attendee) {
			return this.getResourceOrFail('role.attendee');
		}
		throw new Error(`No role for level ${level}`);
	}

	private saveResource(id: string, discordId: string) {
		const resource = new DiscordResource();
		resource.id = id;
		resource.discordId = discordId;
		return this.api.db.getRepository(DiscordResource).save(resource);
	}

	private async getResource(id: string) {
		return (await this.api.db.getRepository(DiscordResource).findOne({ where: { id } }))?.discordId;
	}

	private async getResourceOrFail(id: string) {
		return (await this.api.db.getRepository(DiscordResource).findOneOrFail({ where: { id } })).discordId;
	}

	private async createRole(resourceId: string, data: CreateGuildRoleData) {
		const role: HasId = await this.rest.post(`/guilds/${this.api.options.discord.guildId}/roles`, data);
		await this.saveResource(resourceId, role.id);
		return { id: resourceId, discordId: role.id, role };
	}

	private async ensureRole(resourceId: string, data: CreateGuildRoleData) {
		return await this.getResource(resourceId) || (await this.createRole(resourceId, data)).discordId;
	}

	private async createChannel(resourceId: string, data: CreateGuildChannelData) {
		const channel: HasId = await this.rest.post(`/guilds/${this.api.options.discord.guildId}/channels`, data);
		await this.saveResource(resourceId, channel.id);
		return { id: resourceId, discordId: channel.id, channel };
	}

	private async ensureChannel(resourceId: string, data: CreateGuildChannelData) {
		return await this.getResource(resourceId) || (await this.createChannel(resourceId, data)).discordId;
	}

	public async ensureBasicChannels() {
		await this.ensureStaffChannels();
		await this.ensureHackathonChannels();
		await this.ensureTeamsChannels();
	}

	/*
		Roles
	*/
	public async ensureBasicRoles() {
		await this.ensureRole('role.organiser', templates.roles.organiser());
		await this.ensureRole('role.volunteer', templates.roles.volunteer());
		await this.ensureRole('role.attendee', templates.roles.attendee());
	}

	/*
		Staff Channels
	*/
	private async ensureStaffChannels() {
		const staff = await this.ensureChannel('channel.staff', templates.channels.staffCategory(
			this.api.options.discord.guildId,
			await this.getResourceOrFail('role.organiser'),
			await this.getResourceOrFail('role.volunteer')
		));
		await this.ensureChannel('channel.staff.discussion', templates.channels.staffDiscussion(staff));
		await this.ensureChannel('channel.staff.voice_discussion', templates.channels.staffVoice(staff));
	}

	/*
		Hackathon Channels
	*/
	private async ensureHackathonChannels() {
		const hackathon = await this.ensureChannel('channel.hackathon', templates.channels.hackathonCategory());
		const organiserId = await this.getResourceOrFail('role.organiser');
		const data = {
			guildId: this.api.options.discord.guildId,
			organiserId,
			parentId: hackathon
		};
		await this.ensureChannel('channel.hackathon.announcements', templates.channels.hackathonAnnouncements(data));
		await this.ensureChannel('channel.hackathon.events', templates.channels.hackathonEvents(data));
		await this.ensureChannel('channel.hackathon.twitter', templates.channels.hackathonTwitter(data));
		await this.ensureChannel('channel.hackathon.social', templates.channels.hackathonSocial(hackathon));
		await this.ensureChannel('channel.hackathon.find_team', templates.channels.hackathonFindTeam(hackathon));
	}

	/*
		Team Channels
	*/
	private async ensureTeamsChannels() {
		await this.ensureChannel('channel.teams', templates.channels.teamsCategory(
			this.api.options.discord.guildId,
			await this.getResourceOrFail('role.organiser')
		));

		for (const team of await this.api.controllers.team.getTeams()) {
			await this.ensureTeamState(team);
		}
	}

	private async ensureTeamState(team: AuthTeam) {
		const options = {
			guildId: this.api.options.discord.guildId,
			parentId: await this.getResourceOrFail('channel.teams'),
			organiserId: await this.getResourceOrFail('role.organiser'),
			teamRoleId: await this.ensureRole(`role.teams.${team.teamNumber}`, templates.roles.team(team.teamNumber)),
			team
		};

		await this.ensureChannel(`channel.teams.${team.teamNumber}.text`, templates.channels.teamTextChannel(options));
		await this.ensureChannel(`channel.teams.${team.teamNumber}.voice`, templates.channels.teamVoiceChannel(options));
	}

	private async fetchUserDetails(accessToken: string) {
		const client = new Rest(accessToken, {
			tokenType: TokenType.BEARER,
			agent: this.agent
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
