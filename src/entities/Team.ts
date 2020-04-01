import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Team {
	@PrimaryGeneratedColumn()
	public teamNumber!: number;

	@Column({ unique: true, nullable: false })
	public authId!: string;
}
