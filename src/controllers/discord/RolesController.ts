import { DiscordController } from '../DiscordController';
import { CreateGuildRoleData, HasId } from '../../utils/DiscordConstants';
import languages from '../../utils/ProgrammingLanguages';
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
		const resource = await this.parent.resources.set(resourceId, role.id);
		return resource.discordId;
	}

	public async ensure(resourceId: string, data: CreateGuildRoleData) {
		return await this.parent.resources.getId(resourceId) || this.create(resourceId, data);
	}

	public async ensureBasicRoles() {
		await this.ensure('role.organiser', templates.roles.organiser());
		await this.ensure('role.volunteer', templates.roles.volunteer());
		await this.ensure('role.attendee', templates.roles.attendee());
		await this.ensure('role.muted', templates.roles.muted());

		for (const language of languages) {
			await this.ensure(language.id, templates.roles.language(language.name));
		}
	}
}
