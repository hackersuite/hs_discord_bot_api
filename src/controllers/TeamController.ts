import * as auth from '@unicsmcr/hs_auth_client';
import HackathonAPI from '../HackathonAPI';
import { Team } from '../entities/Team';

export interface APITeam {
	authId: string;
	name: string;
	creator: string;
	teamNumber: number;
}

export class TeamController {
	private readonly api: HackathonAPI;

	public constructor(api: HackathonAPI) {
		this.api = api;
	}

	public async getTeams() {
		const [dbTeams, authTeams] = await Promise.all([
			this.api.db.getRepository(Team).find(),
			auth.getTeams(this.api.options.hsAuth.token)
		]);

		const linkedIds: Map<string, Team> = new Map();
		for (const team of dbTeams) {
			linkedIds.set(team.authId, team);
		}

		const teams = [];
		for (const team of authTeams) {
			const dbTeam = linkedIds.get(team.id);
			if (dbTeam) {
				teams.push(this.transformAuthTeam(team, dbTeam.teamNumber));
			}
		}
		return teams;
	}

	public async getTeam(authId: string) {
		const [dbTeam, authTeam] = await Promise.all([
			this.api.db.getRepository(Team).findOneOrFail({ authId }),
			auth.getTeam(this.api.options.hsAuth.token, authId)
		]);
		return this.transformAuthTeam(authTeam, dbTeam.teamNumber);
	}

	public async putTeam(authId: string) {
		const repo = this.api.db.getRepository(Team);
		let team = await repo.findOne({ authId });
		if (team) return { authId };
		team = new Team();
		team.authId = authId;
		return repo.save(team);
	}

	public async putAllTeams() {
		const teams = await auth.getTeams(this.api.options.hsAuth.token);
		for (const team of teams) {
			await this.putTeam(team.id);
		}
	}

	private transformAuthTeam(team: auth.Team, teamNumber: number): APITeam {
		return {
			authId: team.id,
			creator: team.creator,
			name: team.name,
			teamNumber
		};
	}
}
