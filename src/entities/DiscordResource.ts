import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class DiscordResource {
	@PrimaryColumn()
	public id!: string;

	@Column({ unique: true, nullable: false })
	public discordId!: string;
}
