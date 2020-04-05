import HackathonAPI from '../HackathonAPI';
import { createHmac } from 'crypto';
import axios from 'axios';
import { stringify } from 'querystring';
import { Rest, TokenType } from '@spectacles/rest';
import { Agent } from 'https';
import { DiscordResource } from '../entities/DiscordResource';
import { CreateGuildRoleData, CreateGuildChannelData, HasId, ChannelType, PermissionFlag } from '../utils/DiscordConstants';

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

	private async getOrCreateRole(resourceId: string, data: CreateGuildRoleData) {
		return await this.getResource(resourceId) || (await this.createRole(resourceId, data)).discordId;
	}

	public async ensureBasicRoles() {
		await this.getOrCreateRole('role.organiser', { name: 'Organiser', hoist: true, position: 10 });
		await this.getOrCreateRole('role.volunteer', { name: 'Volunteer', position: 9 });
		await this.getOrCreateRole('role.attendee', { name: 'Attendee', position: 8 });
	}

	private async createChannel(resourceId: string, data: CreateGuildChannelData) {
		const channel: HasId = await this.rest.post(`/guilds/${this.api.options.discord.guildId}/channels`, data);
		await this.saveResource(resourceId, channel.id);
		return { id: resourceId, discordId: channel.id, channel };
	}

	private async getOrCreateChannel(resourceId: string, data: CreateGuildChannelData) {
		return await this.getResource(resourceId) || (await this.createChannel(resourceId, data)).discordId;
	}

	public async ensureBasicChannels() {
		await this.ensureStaffChannels();
		await this.ensureHackathonChannels();
	}

	private async ensureStaffChannels() {
		const staff = await this.getOrCreateChannel('channel.staff', {
			name: 'Staff',
			type: ChannelType.CATEGORY,
			permission_overwrites: [
				{
					type: 'role',
					id: this.api.options.discord.guildId,
					deny: PermissionFlag.VIEW_CHANNEL
				},
				{
					type: 'role',
					id: await this.getResourceOrFail('role.volunteer'),
					allow: PermissionFlag.VIEW_CHANNEL
				},
				{
					type: 'role',
					id: await this.getResourceOrFail('role.organiser'),
					allow: PermissionFlag.VIEW_CHANNEL
				}
			]
		});
		await this.getOrCreateChannel('channel.staff.discussion', {
			name: 'staff-discussion',
			topic: 'A channel to hold discussions between organisers and volunteers',
			type: ChannelType.TEXT,
			parent_id: staff
		});
		await this.getOrCreateChannel('channel.staff.voice_discussion', {
			name: 'Staff Voice Chat',
			type: ChannelType.VOICE,
			parent_id: staff
		});
	}

	private async ensureHackathonChannels() {
		const hackathon = await this.getOrCreateChannel('channel.hackathon', {
			name: 'Hackathon',
			type: ChannelType.CATEGORY
		});

		const onlyOrganisersSend = [
			{
				type: 'role',
				id: this.api.options.discord.guildId,
				deny: PermissionFlag.SEND_MESSAGES
			},
			{
				type: 'role',
				id: await this.getResourceOrFail('role.organiser'),
				allow: PermissionFlag.SEND_MESSAGES
			}
		];

		await this.getOrCreateChannel('channel.hackathon.announcements', {
			name: 'announcements',
			topic: 'Important announcements from the organisers!',
			parent_id: hackathon,
			permission_overwrites: onlyOrganisersSend
		});

		await this.getOrCreateChannel('channel.hackathon.events', {
			name: 'events',
			topic: 'Important events from the events team!',
			parent_id: hackathon,
			permission_overwrites: onlyOrganisersSend
		});

		await this.getOrCreateChannel('channel.hackathon.twitter', {
			name: 'twitter',
			topic: 'Updates from the twitter feed!',
			parent_id: hackathon,
			permission_overwrites: onlyOrganisersSend
		});

		await this.getOrCreateChannel('channel.hackathon.social', {
			name: 'social',
			topic: 'Chat to other participants!',
			parent_id: hackathon,
			rate_limit_per_user: 5
		});

		await this.getOrCreateChannel('channel.hackathon.find_team', {
			name: 'find-a-team',
			topic: 'Find other team mates here!',
			parent_id: hackathon,
			rate_limit_per_user: 5
		});
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
