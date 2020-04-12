import { CreateGuildRoleData } from '../utils/DiscordConstants';

export function organiser(): CreateGuildRoleData {
	return {
		name: 'Organiser',
		hoist: true
	};
}

export function volunteer(): CreateGuildRoleData {
	return {
		name: 'Volunteer'
	};
}

export function attendee(): CreateGuildRoleData {
	return {
		name: 'Attendee'
	};
}

export function team(teamNumber: number): CreateGuildRoleData {
	return {
		name: `Team ${teamNumber}`
	};
}
