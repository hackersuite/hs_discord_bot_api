import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class User {
	@PrimaryColumn()
	public discordId!: string;

	@Column({ unique: true, nullable: false })
	public authId!: string;
}
