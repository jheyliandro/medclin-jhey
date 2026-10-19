import { QueryFailedError } from 'typeorm';
import {
  CreateDoctorDTO,
  DoctorResponseDTO,
  WorkScheduleDTO,
  WorkShiftDTO,
} from '../dtos/doctor.dto';
import { PaginatedResponse } from '../dtos/pagination.dto';
import { UserRole } from '../entities/User';
import * as DoctorRepository from '../repositories/doctor.repository';
import * as UserRepository from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { hashPassword } from '../utils/hash';
import { parsePagination } from '../utils/pagination';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toResponse(doctor: {
  id: number;
  crm: string;
  user: {
    id: string;
    name: string;
    email: string;
    roles: UserRole[];
  };
}): DoctorResponseDTO {
  return {
    id: doctor.id,
    crm: doctor.crm,
    user: {
      id: doctor.user.id,
      name: doctor.user.name,
      email: doctor.user.email,
      roles: doctor.user.roles,
    },
  };
}

function parseId(id: unknown): number {
  const parsed = typeof id === 'string' ? Number(id) : id;
  if (
    typeof parsed !== 'number' ||
    !Number.isSafeInteger(parsed) ||
    parsed <= 0
  ) {
    throw new AppError('Identificador de médico inválido.', 400);
  }
  return parsed;
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505'
  );
}

function validateShifts(shifts: WorkShiftDTO[]): void {
  for (const shift of shifts) {
    if (
      !Number.isInteger(shift.weekDay) ||
      shift.weekDay < 0 ||
      shift.weekDay > 6 ||
      typeof shift.startTime !== 'string' ||
      typeof shift.endTime !== 'string' ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(shift.startTime) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(shift.endTime) ||
      shift.startTime >= shift.endTime ||
      !Number.isInteger(shift.slotDurationMinutes) ||
      shift.slotDurationMinutes <= 0
    ) {
      throw new AppError('Turno de trabalho inválido.', 400);
    }
  }

  for (let i = 0; i < shifts.length; i += 1) {
    for (let j = i + 1; j < shifts.length; j += 1) {
      const first = shifts[i];
      const second = shifts[j];
      if (
        first.weekDay === second.weekDay &&
        first.startTime < second.endTime &&
        second.startTime < first.endTime
      ) {
        throw new AppError('Turnos do mesmo dia não podem se sobrepor.', 400);
      }
    }
  }
}

function toShiftResponse(shift: WorkShiftDTO): WorkShiftDTO {
  return {
    ...shift,
    startTime: shift.startTime.slice(0, 5),
    endTime: shift.endTime.slice(0, 5),
  };
}

export async function createDoctor(
  dto: CreateDoctorDTO,
): Promise<DoctorResponseDTO> {
  if (
    !dto ||
    typeof dto.name !== 'string' ||
    dto.name.trim().length === 0 ||
    dto.name.trim().length > 120 ||
    typeof dto.email !== 'string' ||
    !EMAIL_REGEX.test(dto.email) ||
    typeof dto.password !== 'string' ||
    dto.password.length === 0 ||
    typeof dto.crm !== 'string' ||
    dto.crm.trim().length === 0 ||
    dto.crm.trim().length > 50
  ) {
    throw new AppError('Dados do médico inválidos.', 400);
  }

  if (await UserRepository.findByEmail(dto.email)) {
    throw new AppError('E-mail já cadastrado.', 409, 'EMAIL_JA_CADASTRADO');
  }
  if (await DoctorRepository.findByCrm(dto.crm)) {
    throw new AppError('CRM já cadastrado.', 409, 'CRM_JA_CADASTRADO');
  }

  try {
    const doctor = await DoctorRepository.createDoctorWithUser({
      ...dto,
      name: dto.name.trim(),
      crm: dto.crm.trim(),
      password: await hashPassword(dto.password),
    });
    return toResponse(doctor);
  } catch (error) {
    if (isUniqueViolation(error)) {
      if (await UserRepository.findByEmail(dto.email)) {
        throw new AppError(
          'E-mail já cadastrado.',
          409,
          'EMAIL_JA_CADASTRADO',
        );
      }
      if (await DoctorRepository.findByCrm(dto.crm)) {
        throw new AppError('CRM já cadastrado.', 409, 'CRM_JA_CADASTRADO');
      }
    }
    throw error;
  }
}

export async function getDoctor(id: unknown): Promise<DoctorResponseDTO> {
  const doctor = await DoctorRepository.findById(parseId(id));
  if (!doctor) {
    throw new AppError('Médico não encontrado.', 404);
  }
  return toResponse(doctor);
}

export async function listDoctors(query: {
  page?: unknown;
  pageSize?: unknown;
  name?: unknown;
}): Promise<PaginatedResponse<DoctorResponseDTO>> {
  const { page, pageSize } = parsePagination(query);
  if (query.name !== undefined && typeof query.name !== 'string') {
    throw new AppError('Parâmetro de busca inválido.', 400);
  }
  const { data, total } = await DoctorRepository.listDoctors(
    page,
    pageSize,
    query.name,
  );
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

export async function replaceWorkSchedule(
  doctorId: unknown,
  schedule: WorkScheduleDTO,
): Promise<WorkScheduleDTO> {
  const id = parseId(doctorId);
  if (!schedule || !Array.isArray(schedule.shifts)) {
    throw new AppError('A lista shifts é obrigatória.', 400);
  }
  validateShifts(schedule.shifts);

  if (!(await DoctorRepository.findById(id))) {
    throw new AppError('Médico não encontrado.', 404);
  }
  const shifts = await DoctorRepository.replaceWorkShifts(id, schedule.shifts);
  return { shifts: shifts.map(toShiftResponse) };
}

export async function getWorkSchedule(
  doctorId: unknown,
): Promise<WorkScheduleDTO> {
  const id = parseId(doctorId);
  if (!(await DoctorRepository.findById(id))) {
    throw new AppError('Médico não encontrado.', 404);
  }
  const shifts = await DoctorRepository.findWorkShifts(id);
  return { shifts: shifts.map(toShiftResponse) };
}
