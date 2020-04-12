import HackathonAPI from '../HackathonAPI';
import { Rest } from '@spectacles/rest';
import { Agent } from 'https';
import * as templates from '../templates';
import { RolesController } from './discord/RolesController';
import { ChannelsController } from './discord/ChannelsController';
import { OAuth2Controller } from './discord/OAuth2Controller';
import { MessagesController } from './discord/MessagesController';
import { APITeam } from './TeamController';
import { DiscordResourceController } from './DiscordResourceController';

export class DiscordController {
	public readonly api: HackathonAPI;
	public readonly rest: Rest;
	private readonly agent: Agent;

	public readonly resources: DiscordResourceController;
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
		this.resources = new DiscordResourceController(this.api);
	}

	public async ensureTeamState(team: APITeam) {
		const categoryNumber = Math.floor((team.teamNumber - 1) / 25);
		const categoryName = `channel.teams.groups.${categoryNumber}`;

		const options = {
			guildId: this.api.options.discord.guildId,
			parentId: await this.channels.ensure(categoryName, templates.channels.teamsCategory(
				this.api.options.discord.guildId,
				await this.resources.getIdOrFail('role.organiser'),
				categoryNumber
			)),
			organiserId: await this.resources.getIdOrFail('role.organiser'),
			teamRoleId: await this.roles.ensure(`role.teams.${team.teamNumber}`, templates.roles.team(team.teamNumber)),
			team
		};

		const prefix = `channel.teams.${team.teamNumber}`;

		const textChannel = await this.channels.ensure(`${prefix}.text`, templates.channels.teamTextChannel(options));

		await this.messages.ensure(
			`messages.teams.${team.teamNumber}.welcome`,
			textChannel,
			templates.messages.teamWelcome(team)
		);

		await this.channels.ensure(`channel.teams.${team.teamNumber}.voice`, templates.channels.teamVoiceChannel(options));
	}
}
