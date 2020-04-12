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
		return this.parent.resources.set(resourceId, message.id);
	}

	public async ensure(resourceId: string, channelId: string, data: CreateMessageData) {
		return await this.parent.resources.get(resourceId) || this.create(resourceId, channelId, data);
	}
}
