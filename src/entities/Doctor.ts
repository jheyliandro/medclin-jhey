import {
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { User } from './User';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  crm!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
