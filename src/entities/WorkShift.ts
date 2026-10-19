import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Doctor } from './Doctor';

@Entity('work_shifts')
export class WorkShift {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ name: 'week_day', type: 'smallint' })
  weekDay!: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;

  @Column({ name: 'slot_duration_minutes', type: 'integer' })
  slotDurationMinutes!: number;
}
