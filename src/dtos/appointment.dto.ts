import { AppointmentStatus } from '../entities/Appointment';

export interface CreateAppointmentDTO {
  doctorId: number;
  patientId: number;
  startsAt: string;
}

export interface AppointmentResponseDTO {
  id: number;
  doctorId: number;
  patientId: number;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
}

export interface AppointmentCalendarDTO {
  workSchedule: {
    shifts: Array<{
      weekDay: number;
      startTime: string;
      endTime: string;
      slotDurationMinutes: number;
    }>;
  };
  appointments: AppointmentResponseDTO[];
}
