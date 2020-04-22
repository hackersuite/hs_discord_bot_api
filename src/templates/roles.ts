import { CreateGuildRoleData, PermissionFlag } from '../utils/DiscordConstants';

const volunteerPermissions =
	PermissionFlag.MANAGE_MESSAGES |
	PermissionFlag.MANAGE_NICKNAMES |
	PermissionFlag.VIEW_AUDIT_LOG;

const organiserPermissions = volunteerPermissions |
	PermissionFlag.KICK_MEMBERS |
	PermissionFlag.BAN_MEMBERS;

export function organiser(): CreateGuildRoleData {
	return {
		name: 'Organiser',
		hoist: true,
		permissions: organiserPermissions
	};
}

export function volunteer(): CreateGuildRoleData {
	return {
		name: 'Volunteer',
		hoist: true,
		permissions: volunteerPermissions
	};
}

export function attendee(): CreateGuildRoleData {
	return {
		name: 'Attendee',
		permissions: 0
	};
}

export function muted(): CreateGuildRoleData {
	return {
		name: `Muted`,
		permissions: 0
	};
}

export function team(teamNumber: number): CreateGuildRoleData {
	return {
		name: `Team ${teamNumber}`,
		permissions: 0
	};
}

export function language(name: string): CreateGuildRoleData {
	return {
		name,
		mentionable: true,
		color: 0x1ABC9C,
		permissions: 0
	};
}
