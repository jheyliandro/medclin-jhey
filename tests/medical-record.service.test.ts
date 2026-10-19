import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MedicalRecord } from '../src/entities/MedicalRecord';
import { Doctor } from '../src/entities/Doctor';
import { Patient } from '../src/entities/Patient';
import { UserRole } from '../src/entities/User';
import * as AppointmentRepository from '../src/repositories/appointment.repository';
import * as DoctorRepository from '../src/repositories/doctor.repository';
import * as MedicalRecordRepository from '../src/repositories/medical-record.repository';
import * as PatientRepository from '../src/repositories/patient.repository';
import {
  createMedicalRecord,
  listMedicalRecords,
} from '../src/services/medical-record.service';

vi.mock('../src/repositories/appointment.repository', () => ({
  hasClinicalRelationship: vi.fn(),
}));

vi.mock('../src/repositories/doctor.repository', () => ({
  findByUserId: vi.fn(),
}));

vi.mock('../src/repositories/medical-record.repository', () => ({
  createMedicalRecord: vi.fn(),
  listMedicalRecords: vi.fn(),
}));

vi.mock('../src/repositories/patient.repository', () => ({
  findById: vi.fn(),
}));

const doctor: Doctor = {
  id: 3,
  crm: 'CRM-SC-54321',
  user: {
    id: 'doctor-user-id',
    name: 'Dr. Test',
    email: 'doctor@example.com',
    password: 'hash',
    roles: [UserRole.DOCTOR],
    createdAt: new Date(),
  },
};

const patient: Patient = {
  id: 10,
  name: 'Patient Test',
  cpf: '12345678901',
  createdAt: new Date(),
};

const record: MedicalRecord = {
  id: 5,
  patient,
  doctor,
  text: 'Clinical note',
  createdAt: new Date('2026-10-20T14:25:00.000Z'),
};

describe('medical record service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(PatientRepository.findById).mockResolvedValue(patient);
    vi.mocked(DoctorRepository.findByUserId).mockResolvedValue(doctor);
    vi.mocked(AppointmentRepository.hasClinicalRelationship).mockResolvedValue(
      true,
    );
  });

  it('allows a linked doctor to write using the authenticated doctor id', async () => {
    vi.mocked(MedicalRecordRepository.createMedicalRecord).mockResolvedValue(
      record,
    );

    await expect(
      createMedicalRecord('10', ' Clinical note ', {
        id: 'doctor-user-id',
        roles: [UserRole.DOCTOR],
      }),
    ).resolves.toEqual({
      id: 5,
      patientId: 10,
      doctorId: 3,
      text: 'Clinical note',
      createdAt: record.createdAt,
    });
    expect(MedicalRecordRepository.createMedicalRecord).toHaveBeenCalledWith({
      patientId: 10,
      doctorId: 3,
      text: 'Clinical note',
    });
  });

  it('denies doctors without a clinical relationship', async () => {
    vi.mocked(AppointmentRepository.hasClinicalRelationship).mockResolvedValue(
      false,
    );

    await expect(
      createMedicalRecord('10', 'Clinical note', {
        id: 'doctor-user-id',
        roles: [UserRole.DOCTOR],
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'ACESSO_NEGADO' });
    expect(MedicalRecordRepository.createMedicalRecord).not.toHaveBeenCalled();
  });

  it('does not allow non-doctors to write records', async () => {
    await expect(
      createMedicalRecord('10', 'Clinical note', {
        id: 'admin-id',
        roles: [UserRole.ADMIN],
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows administrators to read records without a doctor relationship', async () => {
    vi.mocked(DoctorRepository.findByUserId).mockResolvedValue(null);
    vi.mocked(MedicalRecordRepository.listMedicalRecords).mockResolvedValue({
      data: [record],
      total: 1,
    });

    await expect(
      listMedicalRecords(
        '10',
        {},
        { id: 'admin-id', roles: [UserRole.ADMIN] },
      ),
    ).resolves.toMatchObject({
      data: [
        { id: 5, patientId: 10, doctorId: 3, text: 'Clinical note' },
      ],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    });
  });

  it('denies unrelated doctors and secretaries from reading records', async () => {
    vi.mocked(AppointmentRepository.hasClinicalRelationship).mockResolvedValue(
      false,
    );
    await expect(
      listMedicalRecords('10', {}, {
        id: 'doctor-user-id',
        roles: [UserRole.DOCTOR],
      }),
    ).rejects.toMatchObject({ statusCode: 403 });

    await expect(
      listMedicalRecords('10', {}, {
        id: 'secretary-id',
        roles: [UserRole.SECRETARY],
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
