import {
  AppointmentCalendarDTO,
  AppointmentResponseDTO,
  CreateAppointmentDTO,
} from '../dtos/appointment.dto';
import { Appointment } from '../entities/Appointment';
import { AppointmentStatus } from '../entities/Appointment';
import { PaginatedResponse } from '../dtos/pagination.dto';
import { UserRole } from '../entities/User';
import * as AppointmentRepository from '../repositories/appointment.repository';
import * as DoctorRepository from '../repositories/doctor.repository';
import * as PatientRepository from '../repositories/patient.repository';
import { AppError } from '../utils/AppError';
import { parsePagination } from '../utils/pagination';
import {
  clinicLocalDateTimeToUtc,
  clinicMinutesSinceMidnight,
  clinicWeekDay,
  getClinicDateTimeParts,
} from '../utils/clinic-time';

function parseId(value: unknown, label: string): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (
    typeof parsed !== 'number' ||
    !Number.isSafeInteger(parsed) ||
    parsed <= 0
  ) {
    throw new AppError(`Identificador ${label} inválido.`, 400);
  }
  return parsed;
}

function parseStartInstant(value: unknown): Date {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  ) {
    throw new AppError('startsAt deve ser uma data ISO 8601 com fuso.', 400);
  }
  parseDateOnly(value.slice(0, 10));
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new AppError('startsAt inválido.', 400);
  }
  return date;
}

function parseDateOnly(value: unknown): {
  year: number;
  month: number;
  day: number;
} {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError('Data deve seguir o formato YYYY-MM-DD.', 400);
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new AppError('Data inválida.', 400);
  }
  return { year, month, day };
}

function toResponse(appointment: Appointment): AppointmentResponseDTO {
  return {
    id: appointment.id,
    doctorId: appointment.doctor.id,
    patientId: appointment.patient.id,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    status: appointment.status,
  };
}

function toClock(value: string): string {
  return value.slice(0, 5);
}

export async function createAppointment(
  dto: CreateAppointmentDTO,
): Promise<AppointmentResponseDTO> {
  if (!dto || typeof dto !== 'object') {
    throw new AppError('Dados do agendamento inválidos.', 400);
  }
  const doctorId = parseId(dto.doctorId, 'médico');
  const patientId = parseId(dto.patientId, 'paciente');

  const doctor = await DoctorRepository.findById(doctorId);
  const patient = await PatientRepository.findById(patientId);
  if (!doctor || !patient) {
    throw new AppError('Médico ou paciente não encontrado.', 404);
  }

  const startsAt = parseStartInstant(dto.startsAt);
  const local = getClinicDateTimeParts(startsAt);
  const startsAtMinute = clinicMinutesSinceMidnight(local);
  const shifts = await DoctorRepository.findWorkShifts(doctorId);
  const shift = shifts.find((candidate) => {
    const startMinute = Number(candidate.startTime.slice(0, 2)) * 60 +
      Number(candidate.startTime.slice(3, 5));
    const endMinute = Number(candidate.endTime.slice(0, 2)) * 60 +
      Number(candidate.endTime.slice(3, 5));
    const offset = startsAtMinute - startMinute;
    return (
      candidate.weekDay === clinicWeekDay(local) &&
      local.second === 0 &&
      startsAt.getUTCMilliseconds() === 0 &&
      offset >= 0 &&
      startsAtMinute < endMinute &&
      offset % candidate.slotDurationMinutes === 0 &&
      offset + candidate.slotDurationMinutes <= endMinute - startMinute
    );
  });

  if (!shift) {
    throw new AppError(
      'O horário não está disponível na escala do médico.',
      422,
      'HORARIO_FORA_DA_ESCALA',
    );
  }

  const endsAt = new Date(
    startsAt.getTime() + shift.slotDurationMinutes * 60_000,
  );
  const result = await AppointmentRepository.createAtomically({
    doctorId,
    patientId,
    startsAt,
    endsAt,
  });

  switch (result.kind) {
    case 'created':
      return toResponse(result.appointment);
    case 'doctor-not-found':
    case 'patient-not-found':
      throw new AppError('Médico ou paciente não encontrado.', 404);
    case 'doctor-unavailable':
      throw new AppError(
        'Este horário acabou de ser ocupado.',
        409,
        'HORARIO_INDISPONIVEL',
      );
    case 'patient-unavailable':
      throw new AppError(
        'O paciente já possui consulta nesse período.',
        409,
        'PACIENTE_INDISPONIVEL',
      );
  }
}

export async function getDoctorCalendar(
  doctorIdValue: unknown,
  fromValue: unknown,
  toValue: unknown,
): Promise<AppointmentCalendarDTO> {
  const doctorId = parseId(doctorIdValue, 'médico');
  const from = parseDateOnly(fromValue);
  const to = parseDateOnly(toValue);
  const startDay = Date.UTC(from.year, from.month - 1, from.day);
  const endDay = Date.UTC(to.year, to.month - 1, to.day);
  const dayCount = (endDay - startDay) / 86_400_000 + 1;
  if (dayCount < 1 || dayCount > 31) {
    throw new AppError('O período deve ter no máximo 31 dias.', 400);
  }
  if (!(await DoctorRepository.findById(doctorId))) {
    throw new AppError('Médico não encontrado.', 404);
  }

  const fromInstant = clinicLocalDateTimeToUtc(
    from.year,
    from.month,
    from.day,
  );
  const toExclusive = clinicLocalDateTimeToUtc(
    to.year,
    to.month,
    to.day + 1,
  );
  const [shifts, appointments] = await Promise.all([
    DoctorRepository.findWorkShifts(doctorId),
    AppointmentRepository.findCalendarAppointments(
      doctorId,
      fromInstant,
      toExclusive,
    ),
  ]);

  return {
    workSchedule: {
      shifts: shifts.map((shift) => ({
        weekDay: shift.weekDay,
        startTime: toClock(shift.startTime),
        endTime: toClock(shift.endTime),
        slotDurationMinutes: shift.slotDurationMinutes,
      })),
    },
    appointments: appointments.map(toResponse),
  };
}

export async function listAppointments(
  query: {
    doctorId?: unknown;
    patientId?: unknown;
    status?: unknown;
    from?: unknown;
    to?: unknown;
    page?: unknown;
    pageSize?: unknown;
  },
  user: { id: string; roles: UserRole[] },
): Promise<PaginatedResponse<AppointmentResponseDTO>> {
  const { page, pageSize } = parsePagination(query);
  let doctorId =
    query.doctorId === undefined
      ? undefined
      : parseId(query.doctorId, 'médico');
  const patientId =
    query.patientId === undefined
      ? undefined
      : parseId(query.patientId, 'paciente');

  let status: AppointmentStatus | undefined;
  if (query.status !== undefined) {
    if (
      typeof query.status !== 'string' ||
      !Object.values(AppointmentStatus).includes(
        query.status as AppointmentStatus,
      )
    ) {
      throw new AppError('Status de agendamento inválido.', 400);
    }
    status = query.status as AppointmentStatus;
  }

  const fromDate =
    query.from === undefined ? undefined : parseDateOnly(query.from);
  const toDate =
    query.to === undefined ? undefined : parseDateOnly(query.to);
  if (
    fromDate &&
    toDate &&
    Date.UTC(fromDate.year, fromDate.month - 1, fromDate.day) >
      Date.UTC(toDate.year, toDate.month - 1, toDate.day)
  ) {
    throw new AppError('O intervalo de datas é inválido.', 400);
  }

  const isDoctorWithoutAdmin =
    user.roles.includes(UserRole.DOCTOR) &&
    !user.roles.includes(UserRole.ADMIN);
  if (isDoctorWithoutAdmin) {
    const doctor = await DoctorRepository.findByUserId(user.id);
    if (!doctor) {
      return {
        data: [],
        meta: { total: 0, page, pageSize, totalPages: 0 },
      };
    }
    doctorId = doctor.id;
  }

  const from = fromDate
    ? clinicLocalDateTimeToUtc(
        fromDate.year,
        fromDate.month,
        fromDate.day,
      )
    : undefined;
  const toExclusive = toDate
    ? clinicLocalDateTimeToUtc(
        toDate.year,
        toDate.month,
        toDate.day + 1,
      )
    : undefined;
  const { data, total } = await AppointmentRepository.listAppointments({
    doctorId,
    patientId,
    status,
    from,
    toExclusive,
    page,
    pageSize,
  });
  return {
    data: data.map(toResponse),
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getAppointment(
  idValue: unknown,
  user: { id: string; roles: UserRole[] },
): Promise<AppointmentResponseDTO> {
  const appointment = await AppointmentRepository.findById(
    parseId(idValue, 'agendamento'),
  );
  if (!appointment) {
    throw new AppError('Agendamento não encontrado.', 404);
  }
  if (
    user.roles.includes(UserRole.DOCTOR) &&
    !user.roles.includes(UserRole.ADMIN) &&
    appointment.doctor.user.id !== user.id
  ) {
    throw new AppError('Acesso negado ao agendamento.', 403);
  }
  return toResponse(appointment);
}
