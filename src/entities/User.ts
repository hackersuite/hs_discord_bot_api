import { Entity, Column, PrimaryColumn, ManyToMany, JoinTable } from 'typeorm';
import { DiscordResource } from './DiscordResource';

@Entity()
export class User {
	@PrimaryColumn()
	public discordId!: string;

	@Column({ unique: true, nullable: false })
	public authId!: string;

	@ManyToMany(() => DiscordResource, resource => resource.name)
	@JoinTable()
	public roles!: DiscordResource[];
}
