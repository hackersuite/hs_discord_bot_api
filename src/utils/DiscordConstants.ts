/* eslint-disable @typescript-eslint/naming-convention */
export interface CreateGuildRoleData {
	name?: string;
	permissions?: number;
	color?: number;
	hoist?: boolean;
	mentionable?: boolean;
	position?: number;
}

export enum ChannelType {
	TEXT,
	DM,
	VOICE,
	GROUP,
	CATEGORY,
	NEWS,
	STORE,
}

export enum PermissionFlag {
	CREATE_INSTANT_INVITE = 1 << 0,
	KICK_MEMBERS = 1 << 1,
	BAN_MEMBERS = 1 << 2,
	ADMINISTRATOR = 1 << 3,
	MANAGE_CHANNELS = 1 << 4,
	MANAGE_GUILD = 1 << 5,
	ADD_REACTIONS = 1 << 6,
	VIEW_AUDIT_LOG = 1 << 7,
	PRIORITY_SPEAKER = 1 << 8,
	STREAM = 1 << 9,
	VIEW_CHANNEL = 1 << 10,
	SEND_MESSAGES = 1 << 11,
	SEND_TTS_MESSAGES = 1 << 12,
	MANAGE_MESSAGES = 1 << 13,
	EMBED_LINKS = 1 << 14,
	ATTACH_FILES = 1 << 15,
	READ_MESSAGE_HISTORY = 1 << 16,
	MENTION_EVERYONE = 1 << 17,
	USE_EXTERNAL_EMOJIS = 1 << 18,
	VIEW_GUILD_INSIGHTS = 1 << 19,
	CONNECT = 1 << 20,
	SPEAK = 1 << 21,
	MUTE_MEMBERS = 1 << 22,
	DEAFEN_MEMBERS = 1 << 23,
	MOVE_MEMBERS = 1 << 24,
	USE_VAD = 1 << 25,
	CHANGE_NICKNAME = 1 << 26,
	MANAGE_NICKNAMES = 1 << 27,
	MANAGE_ROLES = 1 << 28,
	MANAGE_WEBHOOKS = 1 << 29,
	MANAGE_EMOJIS = 1 << 30
}

export interface HasId {
	id: string;
}

// not a full user, only properties we're interested in
// see https://discordapp.com/developers/docs/resources/user#user-object
export interface DiscordUser {
	id: string;
	locale: string;
}

export interface PermissionOverwrite {
	id: string;
	type: string;
	allow?: number;
	deny?: number;
}

export interface CreateGuildChannelData {
	name: string;
	type: ChannelType;
	topic?: string;
	bitrate?: number;
	user_limit?: number;
	rate_limit_per_user?: number;
	position?: number;
	permission_overwrites?: PermissionOverwrite[];
	parent_id?: string;
	nsfw?: boolean;
}

export interface CreateGuildChannelData {
	name: string;
	type: ChannelType;
	topic?: string;
	bitrate?: number;
	user_limit?: number;
	rate_limit_per_user?: number;
	position?: number;
	permission_overwrites?: PermissionOverwrite[];
	parent_id?: string;
	nsfw?: boolean;
}

export interface EmbedFooter {
	text: string;
	icon_url?: string;
	proxy_icon_url?: string;
}

export interface EmbedImage {
	url?: string;
	proxy_url?: string;
	height?: number;
	width?: number;
}

export interface EmbedVideo {
	url?: string;
	height?: number;
	width?: number;
}

export interface EmbedProvider {
	name?: string;
	url?: string;
}

export interface EmbedAuthor {
	name?: string;
	url?: string;
	icon_url?: string;
	proxy_icon_url?: string;
}

export interface EmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

export interface Embed {
	title?: string;
	type?: string; // rich, image, video, gifv, article, link
	description?: string;
	url?: string;
	timestamp?: string;
	color?: number;
	footer?: EmbedFooter;
	image?: EmbedImage;
	thumbnail?: EmbedImage;
	video?: EmbedVideo;
	provider?: EmbedProvider;
	author?: EmbedAuthor;
	fields?: EmbedField[];
}

export interface CreateMessageData {
	content?: string;
	nonce?: number | string;
	tts?: boolean;
	embed?: Embed;
}
