import HackathonAPI from '../HackathonAPI';
import { Rest } from '@spectacles/rest';
import { Agent } from 'https';
import { DiscordResource } from '../entities/DiscordResource';
import * as templates from '../templates';
import { RolesController } from './discord/RolesController';
import { ChannelsController } from './discord/ChannelsController';
import { OAuth2Controller } from './discord/OAuth2Controller';
import { MessagesController } from './discord/MessagesController';

export interface AuthTeam {
	authId: string;
	name: string;
	creator: string;
	teamNumber: number;
}

export class DiscordController {
	public readonly api: HackathonAPI;
	public readonly rest: Rest;
	private readonly agent: Agent;

	public readonly roles: RolesController;
	public readonly channels: ChannelsController;
	public readonly oauth2: OAuth2Controller;
	public readonly messages: MessagesController;

	public constructor(api: HackathonAPI) {
		this.api = api;
		this.agent = new Agent({ keepAlive: true });
		this.rest = new Rest(api.options.discord.botToken, { agent: this.agent });
		this.roles = new RolesController(this);
		this.channels = new ChannelsController(this);
		this.oauth2 = new OAuth2Controller(this);
		this.messages = new MessagesController(this);
	}

	public saveResource(id: string, discordId: string) {
		const resource = new DiscordResource();
		resource.id = id;
		resource.discordId = discordId;
		return this.api.db.getRepository(DiscordResource).save(resource);
	}

	public async getResource(id: string) {
		return (await this.api.db.getRepository(DiscordResource).findOne({ where: { id } }))?.discordId;
	}

	public async getResourceOrFail(id: string) {
		return (await this.api.db.getRepository(DiscordResource).findOneOrFail({ where: { id } })).discordId;
	}

	public async ensureTeamState(team: AuthTeam) {
		const options = {
			guildId: this.api.options.discord.guildId,
			parentId: await this.getResourceOrFail('channel.teams'),
			organiserId: await this.getResourceOrFail('role.organiser'),
			teamRoleId: await this.roles.ensure(`role.teams.${team.teamNumber}`, templates.roles.team(team.teamNumber)),
			team
		};

		await this.channels.ensure(`channel.teams.${team.teamNumber}.text`, templates.channels.teamTextChannel(options));
		await this.channels.ensure(`channel.teams.${team.teamNumber}.voice`, templates.channels.teamVoiceChannel(options));
	}
}
