import { DiscordController } from '../DiscordController';
import { CreateMessageData, HasId } from '../../utils/DiscordConstants';

export class MessagesController {
	private readonly parent: DiscordController;

	public constructor(parent: DiscordController) {
		this.parent = parent;
	}

	private get guildId() {
		return this.parent.api.options.discord.guildId;
	}

	public async create(resourceId: string, channelId: string, data: CreateMessageData) {
		const message: HasId = await this.parent.rest.post(`/channels/${channelId}/messages`, data);
		await this.parent.saveResource(resourceId, message.id);
		return { id: resourceId, discordId: message.id, message };
	}

	public async ensure(resourceId: string, channelId: string, data: CreateMessageData) {
		return await this.parent.getResource(resourceId) || (await this.create(resourceId, channelId, data)).discordId;
	}
}
