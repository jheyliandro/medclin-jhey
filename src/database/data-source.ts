import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Patient } from '../entities/Patient';
import { Doctor } from '../entities/Doctor';
import { WorkShift } from '../entities/WorkShift';
import { Appointment } from '../entities/Appointment';
import { MedicalRecord } from '../entities/MedicalRecord';
import { InitialSchema1760910000000 } from './migrations/InitialSchema1760910000000';
import { AddDoctorsWorkSchedule1760911000000 } from './migrations/AddDoctorsWorkSchedule1760911000000';
import { AddAppointments1760912000000 } from './migrations/AddAppointments1760912000000';
import { AddMedicalRecords1760913000000 } from './migrations/AddMedicalRecords1760913000000';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME ?? 'medclin_db',
  ssl:
    process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  synchronize: false,
  logging: false,
  entities: [User, Patient, Doctor, WorkShift, Appointment, MedicalRecord],
  migrations: [
    InitialSchema1760910000000,
    AddDoctorsWorkSchedule1760911000000,
    AddAppointments1760912000000,
    AddMedicalRecords1760913000000,
  ],
  subscribers: [],
  migrationsRun: true,
});
