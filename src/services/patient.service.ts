import { QueryFailedError } from 'typeorm';
import {
  CreatePatientDTO,
  PatientResponseDTO,
  UpdatePatientDTO,
} from '../dtos/patient.dto';
import { PaginatedResponse } from '../dtos/pagination.dto';
import * as PatientRepository from '../repositories/patient.repository';
import { AppError } from '../utils/AppError';
import { parsePagination } from '../utils/pagination';

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

function toResponse(patient: {
  id: number;
  name: string;
  cpf: string;
  createdAt: Date;
}): PatientResponseDTO {
  return {
    id: patient.id,
    name: patient.name,
    cpf: patient.cpf,
    createdAt: patient.createdAt,
  };
}

function parseId(id: unknown): number {
  const parsed = typeof id === 'string' ? Number(id) : id;
  if (
    typeof parsed !== 'number' ||
    !Number.isSafeInteger(parsed) ||
    parsed <= 0
  ) {
    throw new AppError('Identificador de paciente inválido.', 400);
  }
  return parsed;
}

export async function createPatient(
  dto: CreatePatientDTO,
): Promise<PatientResponseDTO> {
  if (
    !dto ||
    typeof dto.name !== 'string' ||
    dto.name.trim().length === 0 ||
    dto.name.trim().length > 120 ||
    typeof dto.cpf !== 'string' ||
    !/^\d{11}$/.test(dto.cpf)
  ) {
    throw new AppError('Nome ou CPF inválido.', 400);
  }

  if (await PatientRepository.findByCpf(dto.cpf)) {
    throw new AppError('CPF já cadastrado.', 409, 'CPF_JA_CADASTRADO');
  }

  try {
    return toResponse(
      await PatientRepository.createPatient(dto.name.trim(), dto.cpf),
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError('CPF já cadastrado.', 409, 'CPF_JA_CADASTRADO');
    }
    throw error;
  }
}

export async function getPatient(id: unknown): Promise<PatientResponseDTO> {
  const patient = await PatientRepository.findById(parseId(id));
  if (!patient) {
    throw new AppError('Paciente não encontrado.', 404);
  }
  return toResponse(patient);
}

export async function updatePatient(
  id: unknown,
  dto: UpdatePatientDTO,
): Promise<PatientResponseDTO> {
  if (
    !dto ||
    typeof dto.name !== 'string' ||
    dto.name.trim().length === 0 ||
    dto.name.trim().length > 120
  ) {
    throw new AppError('O nome do paciente é obrigatório.', 400);
  }

  const updated = await PatientRepository.updatePatient(
    parseId(id),
    dto.name.trim(),
  );
  if (!updated) {
    throw new AppError('Paciente não encontrado.', 404);
  }
  return toResponse(updated);
}

export async function deletePatient(id: unknown): Promise<void> {
  if (!(await PatientRepository.deletePatient(parseId(id)))) {
    throw new AppError('Paciente não encontrado.', 404);
  }
}

export async function listPatients(query: {
  page?: unknown;
  pageSize?: unknown;
  name?: unknown;
}): Promise<PaginatedResponse<PatientResponseDTO>> {
  const { page, pageSize } = parsePagination(query);
  if (query.name !== undefined && typeof query.name !== 'string') {
    throw new AppError('Parâmetro de busca inválido.', 400);
  }

  const { data, total } = await PatientRepository.listPatients(
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
