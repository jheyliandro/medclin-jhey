import { PaginatedResponse } from '../dtos/pagination.dto';
import { MedicalRecordResponseDTO } from '../dtos/medical-record.dto';
import { UserRole } from '../entities/User';
import * as AppointmentRepository from '../repositories/appointment.repository';
import * as DoctorRepository from '../repositories/doctor.repository';
import * as MedicalRecordRepository from '../repositories/medical-record.repository';
import * as PatientRepository from '../repositories/patient.repository';
import { AppError } from '../utils/AppError';
import { parsePagination } from '../utils/pagination';

function parsePatientId(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (
    typeof parsed !== 'number' ||
    !Number.isSafeInteger(parsed) ||
    parsed <= 0
  ) {
    throw new AppError('Identificador de paciente inválido.', 400);
  }
  return parsed;
}

function toResponse(record: {
  id: number;
  patient: { id: number };
  doctor: { id: number };
  text: string;
  createdAt: Date;
}): MedicalRecordResponseDTO {
  return {
    id: record.id,
    patientId: record.patient.id,
    doctorId: record.doctor.id,
    text: record.text,
    createdAt: record.createdAt,
  };
}

export async function createMedicalRecord(
  patientIdValue: unknown,
  textValue: unknown,
  user: { id: string; roles: UserRole[] },
): Promise<MedicalRecordResponseDTO> {
  const patientId = parsePatientId(patientIdValue);
  if (typeof textValue !== 'string' || textValue.trim().length === 0) {
    throw new AppError('O texto do prontuário é obrigatório.', 400);
  }
  if (!user.roles.includes(UserRole.DOCTOR)) {
    throw new AppError('Somente médicos podem escrever no prontuário.', 403);
  }
  if (!(await PatientRepository.findById(patientId))) {
    throw new AppError('Paciente não encontrado.', 404);
  }
  const doctor = await DoctorRepository.findByUserId(user.id);
  if (
    !doctor ||
    !(await AppointmentRepository.hasClinicalRelationship(
      doctor.id,
      patientId,
    ))
  ) {
    throw new AppError('Médico sem vínculo com o paciente.', 403);
  }

  const record = await MedicalRecordRepository.createMedicalRecord({
    patientId,
    doctorId: doctor.id,
    text: textValue.trim(),
  });
  return toResponse(record);
}

export async function listMedicalRecords(
  patientIdValue: unknown,
  query: { page?: unknown; pageSize?: unknown },
  user: { id: string; roles: UserRole[] },
): Promise<PaginatedResponse<MedicalRecordResponseDTO>> {
  const patientId = parsePatientId(patientIdValue);
  const { page, pageSize } = parsePagination(query);
  if (!(await PatientRepository.findById(patientId))) {
    throw new AppError('Paciente não encontrado.', 404);
  }

  if (
    !user.roles.includes(UserRole.ADMIN) &&
    !user.roles.includes(UserRole.DOCTOR)
  ) {
    throw new AppError('Acesso negado ao prontuário.', 403);
  }

  if (
    user.roles.includes(UserRole.DOCTOR) &&
    !user.roles.includes(UserRole.ADMIN)
  ) {
    const doctor = await DoctorRepository.findByUserId(user.id);
    if (
      !doctor ||
      !(await AppointmentRepository.hasClinicalRelationship(
        doctor.id,
        patientId,
      ))
    ) {
      throw new AppError('Médico sem vínculo com o paciente.', 403);
    }
  }

  const { data, total } = await MedicalRecordRepository.listMedicalRecords(
    patientId,
    page,
    pageSize,
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
