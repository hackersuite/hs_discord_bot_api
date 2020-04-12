import { DiscordController } from '../DiscordController';
import { CreateGuildChannelData, HasId } from '../../utils/DiscordConstants';
import * as templates from '../../templates';

export class ChannelsController {
	private readonly parent: DiscordController;

	public constructor(parent: DiscordController) {
		this.parent = parent;
	}

	private get guildId() {
		return this.parent.api.options.discord.guildId;
	}

	public async create(resourceId: string, data: CreateGuildChannelData) {
		const channel: HasId = await this.parent.rest.post(`/guilds/${this.guildId}/channels`, data);
		await this.parent.saveResource(resourceId, channel.id);
		return { id: resourceId, discordId: channel.id, channel };
	}

	public async ensure(resourceId: string, data: CreateGuildChannelData) {
		return await this.parent.getResource(resourceId) || (await this.create(resourceId, data)).discordId;
	}

	public async ensureChannels() {
		await this.ensureStaffChannels();
		await this.ensureHackathonChannels();
		await this.ensureTeamsChannels();
	}

	private async ensureStaffChannels() {
		const staff = await this.ensure('channel.staff', templates.channels.staffCategory(
			this.guildId,
			await this.parent.getResourceOrFail('role.organiser'),
			await this.parent.getResourceOrFail('role.volunteer')
		));
		await this.ensure('channel.staff.discussion', templates.channels.staffDiscussion(staff));
		await this.ensure('channel.staff.twitter_staging', templates.channels.staffTwitterStaging(staff));
		await this.ensure('channel.staff.voice_discussion', templates.channels.staffVoice(staff));
	}

	private async ensureHackathonChannels() {
		const hackathon = await this.ensure('channel.hackathon', templates.channels.hackathonCategory());
		const organiserId = await this.parent.getResourceOrFail('role.organiser');
		const data = {
			guildId: this.guildId,
			organiserId,
			parentId: hackathon
		};
		await this.ensure('channel.hackathon.announcements', templates.channels.hackathonAnnouncements(data));
		await this.ensure('channel.hackathon.events', templates.channels.hackathonEvents(data));
		await this.ensure('channel.hackathon.twitter', templates.channels.hackathonTwitter(data));
		await this.ensure('channel.hackathon.social', templates.channels.hackathonSocial(hackathon));
		await this.ensure('channel.hackathon.find_team', templates.channels.hackathonFindTeam(hackathon));
	}

	private async ensureTeamsChannels() {
		await this.ensure('channel.teams', templates.channels.teamsCategory(
			this.parent.api.options.discord.guildId,
			await this.parent.getResourceOrFail('role.organiser')
		));

		for (const team of await this.parent.api.controllers.team.getTeams()) {
			await this.parent.ensureTeamState(team);
		}
	}
}
