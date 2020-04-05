export interface CreateGuildRoleData {
	name?: string;
	permissions?: number;
	color?: number;
	hoist?: boolean;
	mentionable?: boolean;
	position: number;
}

export interface RoleData extends Required<CreateGuildRoleData> {
	id: string;
	managed: boolean;
}
