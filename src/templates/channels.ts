import { CreateGuildChannelData, ChannelType, PermissionFlag, PermissionOverwrite } from '../utils/DiscordConstants';
import { APITeam } from '../controllers/TeamController';

export function staffCategory(guildId: string, organiserId: string, volunteerId: string): CreateGuildChannelData {
	return {
		name: 'Staff',
		type: ChannelType.CATEGORY,
		permission_overwrites: [
			{
				type: 'role',
				id: guildId,
				deny: PermissionFlag.VIEW_CHANNEL
			},
			{
				type: 'role',
				id: organiserId,
				allow: PermissionFlag.VIEW_CHANNEL
			},
			{
				type: 'role',
				id: volunteerId,
				allow: PermissionFlag.VIEW_CHANNEL
			}
		]
	};
}

export function staffDiscussion(parentId: string): CreateGuildChannelData {
	return {
		name: 'staff-discussion',
		topic: 'A channel to hold discussions between organisers and volunteers',
		type: ChannelType.TEXT,
		parent_id: parentId
	};
}

export function staffTwitterStaging(parentId: string): CreateGuildChannelData {
	return {
		name: 'twitter-staging',
		topic: 'React with 👍 to approve a tweet, and 👎 to reject it',
		type: ChannelType.TEXT,
		parent_id: parentId
	};
}

export function staffVoice(parentId: string): CreateGuildChannelData {
	return {
		name: 'Staff Voice Chat',
		type: ChannelType.VOICE,
		parent_id: parentId
	};
}

export function hackathonCategory(): CreateGuildChannelData {
	return {
		name: 'Hackathon',
		type: ChannelType.CATEGORY
	};
}

function muted(roleId: string): PermissionOverwrite {
	return 		{
		type: 'role',
		id: roleId,
		deny: PermissionFlag.SEND_MESSAGES
	};
}

function publicReadonly(guildId: string, organiserId: string): PermissionOverwrite[] {
	return [
		muted(guildId),
		{
			type: 'role',
			id: organiserId,
			allow: PermissionFlag.SEND_MESSAGES
		}
	];
}


interface HackathonOptions {
	guildId: string;
	parentId: string;
	organiserId: string;
	mutedId: string;
}

export function hackathonAnnouncements(options: HackathonOptions): CreateGuildChannelData {
	return {
		name: 'announcements',
		topic: 'Important announcements from the organisers!',
		parent_id: options.parentId,
		permission_overwrites: [...publicReadonly(options.guildId, options.organiserId), muted(options.mutedId)],
		type: ChannelType.TEXT
	};
}

export function hackathonEvents(options: HackathonOptions): CreateGuildChannelData {
	return {
		name: 'events',
		topic: 'Important announcements from the events!',
		parent_id: options.parentId,
		permission_overwrites: [...publicReadonly(options.guildId, options.organiserId), muted(options.mutedId)],
		type: ChannelType.TEXT
	};
}

export function hackathonTwitter(options: HackathonOptions): CreateGuildChannelData {
	return {
		name: 'twitter',
		topic: 'Updates from the Twitter feed!',
		parent_id: options.parentId,
		permission_overwrites: [...publicReadonly(options.guildId, options.organiserId), muted(options.mutedId)],
		type: ChannelType.TEXT
	};
}

export function hackathonSocial(options: HackathonOptions): CreateGuildChannelData {
	return {
		name: 'social',
		topic: 'Chat to other participants!',
		parent_id: options.parentId,
		rate_limit_per_user: 5,
		permission_overwrites: [muted(options.mutedId)],
		type: ChannelType.TEXT
	};
}

export function hackathonFindTeam(options: HackathonOptions): CreateGuildChannelData {
	return {
		name: 'find-a-team',
		topic: 'Find other team mates here!',
		parent_id: options.parentId,
		rate_limit_per_user: 5,
		permission_overwrites: [muted(options.mutedId)],
		type: ChannelType.TEXT
	};
}

function teamsChannelsBasePermissions(guildId: string, organiserId: string): PermissionOverwrite[] {
	return [
		{
			type: 'role',
			id: guildId,
			deny: PermissionFlag.VIEW_CHANNEL
		},
		{
			type: 'role',
			id: organiserId,
			allow: PermissionFlag.VIEW_CHANNEL
		}
	];
}

function teamChannelsPermissions(options: TeamChannelOptions): PermissionOverwrite[] {
	return [
		...teamsChannelsBasePermissions(options.guildId, options.organiserId),
		{
			type: 'role',
			id: options.teamRoleId,
			allow: (PermissionFlag.VIEW_CHANNEL |
							PermissionFlag.SEND_MESSAGES |
							PermissionFlag.ATTACH_FILES |
							PermissionFlag.SPEAK)
		}
	];
}

export function teamsCategory(guildId: string, organiserId: string, group: number): CreateGuildChannelData {
	return {
		name: `Teams ${(group * 25) + 1} - ${(group + 1) * 25}`,
		type: ChannelType.CATEGORY,
		permission_overwrites: teamsChannelsBasePermissions(guildId, organiserId)
	};
}

interface TeamChannelOptions {
	guildId: string;
	parentId: string;
	organiserId: string;
	teamRoleId: string;
	team: APITeam;
}

export function teamTextChannel(options: TeamChannelOptions): CreateGuildChannelData {
	return {
		name: `team-${options.team.teamNumber}`,
		topic: `${options.team.name} | Auth ID: ${options.team.authId}`,
		type: ChannelType.TEXT,
		permission_overwrites: teamChannelsPermissions(options),
		parent_id: options.parentId
	};
}

export function teamVoiceChannel(options: TeamChannelOptions): CreateGuildChannelData {
	return {
		name: `Team ${options.team.teamNumber}`,
		type: ChannelType.VOICE,
		permission_overwrites: teamChannelsPermissions(options),
		parent_id: options.parentId
	};
}
