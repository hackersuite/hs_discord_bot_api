import * as auth from '@unicsmcr/hs_auth_client';
import HackathonAPI from '../HackathonAPI';
import { Team } from '../entities/Team';

export interface APITeam {
	authId: string;
	name: string;
	creator: string;
	teamNumber: number;
}

export default class TeamController {
	private readonly api: HackathonAPI;

	public constructor(api: HackathonAPI) {
		this.api = api;
	}

	public async getTeams() {
		const db = this.getDB();

		const [dbTeams, authTeams] = await Promise.all([
			db.getRepository(Team).find(),
			auth.getTeams(this.api.options.hsAuth.token)
		]);

		const linkedIds: Map<string, Team> = new Map();
		for (const team of dbTeams) {
			linkedIds.set(team.authId, team);
		}

		const teams = [];
		for (const team of authTeams) {
			const dbTeam = linkedIds.get(team._id);
			if (dbTeam) {
				teams.push(this.transformAuthTeam(team, dbTeam.teamNumber));
			}
		}
		return teams;
	}

	private transformAuthTeam(team: auth.Team, teamNumber: number): APITeam {
		return {
			authId: team._id,
			creator: team.creator,
			name: team.name,
			teamNumber
		};
	}

	private getDB() {
		if (!this.api.db) {
			throw new Error('No database!');
		}
		return this.api.db;
	}
}
