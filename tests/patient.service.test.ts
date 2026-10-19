import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryFailedError } from 'typeorm';
import { Patient } from '../src/entities/Patient';
import * as PatientRepository from '../src/repositories/patient.repository';
import { AppError } from '../src/utils/AppError';
import {
  createPatient,
  deletePatient,
  getPatient,
  listPatients,
  updatePatient,
} from '../src/services/patient.service';

vi.mock('../src/repositories/patient.repository', () => ({
  findById: vi.fn(),
  findByCpf: vi.fn(),
  createPatient: vi.fn(),
  updatePatient: vi.fn(),
  deletePatient: vi.fn(),
  listPatients: vi.fn(),
}));

const patient: Patient = {
  id: 7,
  name: 'Carlos Pereira',
  cpf: '12345678901',
  createdAt: new Date('2026-10-20T14:03:11.000Z'),
};

describe('patient service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates a patient with a normalized name', async () => {
    vi.mocked(PatientRepository.findByCpf).mockResolvedValue(null);
    vi.mocked(PatientRepository.createPatient).mockResolvedValue(patient);

    await expect(
      createPatient({ name: ' Carlos Pereira ', cpf: '12345678901' }),
    ).resolves.toEqual(patient);
    expect(PatientRepository.createPatient).toHaveBeenCalledWith(
      'Carlos Pereira',
      '12345678901',
    );
  });

  it('rejects malformed CPF and duplicate CPF', async () => {
    await expect(
      createPatient({ name: 'Carlos Pereira', cpf: '123.456.789-01' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'DADOS_INVALIDOS' });
    expect(PatientRepository.findByCpf).not.toHaveBeenCalled();

    vi.mocked(PatientRepository.findByCpf).mockResolvedValue(patient);
    await expect(
      createPatient({ name: 'Another Patient', cpf: '12345678901' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CPF_JA_CADASTRADO',
    });
  });

  it('maps a concurrent CPF uniqueness violation to the contract error', async () => {
    vi.mocked(PatientRepository.findByCpf).mockResolvedValue(null);
    vi.mocked(PatientRepository.createPatient).mockRejectedValue(
      new QueryFailedError(
        'INSERT INTO patients',
        [],
        Object.assign(new Error('unique violation'), { code: '23505' }),
      ),
    );

    await expect(
      createPatient({ name: 'Another Patient', cpf: '12345678901' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CPF_JA_CADASTRADO',
    });
  });

  it('rethrows database failures that are not uniqueness violations', async () => {
    const failure = new Error('database unavailable');
    vi.mocked(PatientRepository.findByCpf).mockResolvedValue(null);
    vi.mocked(PatientRepository.createPatient).mockRejectedValue(failure);

    await expect(
      createPatient({ name: 'Another Patient', cpf: '12345678901' }),
    ).rejects.toBe(failure);
  });

  it('returns a paginated result with defaults', async () => {
    vi.mocked(PatientRepository.listPatients).mockResolvedValue({
      data: [patient],
      total: 21,
    });

    await expect(listPatients({})).resolves.toEqual({
      data: [patient],
      meta: { total: 21, page: 1, pageSize: 20, totalPages: 2 },
    });
    expect(PatientRepository.listPatients).toHaveBeenCalledWith(1, 20, undefined);
  });

  it('applies valid pagination and name filters', async () => {
    vi.mocked(PatientRepository.listPatients).mockResolvedValue({
      data: [patient],
      total: 1,
    });

    await expect(
      listPatients({ page: '2', pageSize: '5', name: 'Carlos' }),
    ).resolves.toMatchObject({
      meta: { total: 1, page: 2, pageSize: 5, totalPages: 1 },
    });
    expect(PatientRepository.listPatients).toHaveBeenCalledWith(
      2,
      5,
      'Carlos',
    );
  });

  it('rejects invalid pagination and identifiers', async () => {
    await expect(listPatients({ page: '0' })).rejects.toBeInstanceOf(AppError);
    await expect(listPatients({ pageSize: '101' })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(listPatients({ name: ['Carlos'] })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(getPatient('1.2')).rejects.toMatchObject({
      statusCode: 400,
      code: 'DADOS_INVALIDOS',
    });
  });

  it('returns not found for missing patients', async () => {
    vi.mocked(PatientRepository.findById).mockResolvedValue(null);
    vi.mocked(PatientRepository.updatePatient).mockResolvedValue(null);
    vi.mocked(PatientRepository.deletePatient).mockResolvedValue(false);

    await expect(getPatient('999')).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      updatePatient(999, { name: 'Updated' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(deletePatient(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns existing patients and rejects invalid update names', async () => {
    vi.mocked(PatientRepository.findById).mockResolvedValue(patient);

    await expect(getPatient('7')).resolves.toEqual(patient);
    await expect(updatePatient(7, { name: ' ' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'DADOS_INVALIDOS',
    });
  });

  it('updates and deletes existing patients', async () => {
    const updated = { ...patient, name: 'Updated Patient' };
    vi.mocked(PatientRepository.updatePatient).mockResolvedValue(updated);
    vi.mocked(PatientRepository.deletePatient).mockResolvedValue(true);

    await expect(updatePatient('7', { name: 'Updated Patient' })).resolves.toEqual(
      updated,
    );
    await expect(deletePatient(7)).resolves.toBeUndefined();
  });
});
