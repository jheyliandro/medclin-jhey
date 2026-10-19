import { UserRole } from '../entities/User';

export interface CreateDoctorDTO {
  name: string;
  email: string;
  password: string;
  crm: string;
}

export interface DoctorUserDTO {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
}

export interface DoctorResponseDTO {
  id: number;
  crm: string;
  user: DoctorUserDTO;
}

export interface WorkShiftDTO {
  weekDay: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export interface WorkScheduleDTO {
  shifts: WorkShiftDTO[];
}
