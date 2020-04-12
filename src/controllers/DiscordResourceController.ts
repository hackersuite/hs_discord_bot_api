import HackathonAPI from '../HackathonAPI';
import { DiscordResource } from '../entities/DiscordResource';

export class DiscordResourceController {
	private readonly api: HackathonAPI;

	public constructor(api: HackathonAPI) {
		this.api = api;
	}

	public get(name: string) {
		return this.api.db.getRepository(DiscordResource).findOne(name);
	}

	public getOrFail(name: string) {
		return this.api.db.getRepository(DiscordResource).findOneOrFail(name);
	}

	public async getId(name: string) {
		return (await this.get(name))?.discordId;
	}

	public async getIdOrFail(name: string) {
		return (await this.getOrFail(name)).discordId;
	}

	public set(name: string, discordId: string) {
		const resource = new DiscordResource();
		resource.name = name;
		resource.discordId = discordId;
		return this.api.db.getRepository(DiscordResource).save(resource);
	}
}
