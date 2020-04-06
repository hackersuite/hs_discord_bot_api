import { DiscordController } from '../DiscordController';
import { CreateGuildChannelData, HasId } from '../../utils/DiscordConstants';

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
}
