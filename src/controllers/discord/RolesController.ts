import { DiscordController } from '../DiscordController';
import { CreateGuildRoleData, HasId } from '../../utils/DiscordConstants';

export class RolesController {
	private readonly parent: DiscordController;

	public constructor(parent: DiscordController) {
		this.parent = parent;
	}

	private get guildId() {
		return this.parent.api.options.discord.guildId;
	}

	public async create(resourceId: string, data: CreateGuildRoleData) {
		const role: HasId = await this.parent.rest.post(`/guilds/${this.guildId}/roles`, data);
		await this.parent.saveResource(resourceId, role.id);
		return { id: resourceId, discordId: role.id, role };
	}

	public async ensure(resourceId: string, data: CreateGuildRoleData) {
		return await this.parent.getResource(resourceId) ||
			(await this.create(resourceId, data)).discordId;
	}
}
