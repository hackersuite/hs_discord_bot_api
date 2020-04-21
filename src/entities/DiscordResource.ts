import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class DiscordResource {
	@PrimaryColumn()
	public name!: string;

	@Column({ unique: true, nullable: false })
	public discordId!: string;
}
