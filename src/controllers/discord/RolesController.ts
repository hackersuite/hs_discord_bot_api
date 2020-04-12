import { DiscordController } from '../DiscordController';
import { CreateGuildRoleData, HasId } from '../../utils/DiscordConstants';
import * as templates from '../../templates';

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

	public async ensureBasicRoles() {
		await this.ensure('role.organiser', templates.roles.organiser());
		await this.ensure('role.volunteer', templates.roles.volunteer());
		await this.ensure('role.attendee', templates.roles.attendee());
	}
}
