import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryFailedError } from 'typeorm';
import { Doctor } from '../src/entities/Doctor';
import { WorkScheduleDTO } from '../src/dtos/doctor.dto';
import { UserRole } from '../src/entities/User';
import * as DoctorRepository from '../src/repositories/doctor.repository';
import * as UserRepository from '../src/repositories/user.repository';
import { hashPassword } from '../src/utils/hash';
import { AppError } from '../src/utils/AppError';
import {
  createDoctor,
  getDoctor,
  getWorkSchedule,
  listDoctors,
  replaceWorkSchedule,
} from '../src/services/doctor.service';

vi.mock('../src/repositories/doctor.repository', () => ({
  findById: vi.fn(),
  findByCrm: vi.fn(),
  createDoctorWithUser: vi.fn(),
  listDoctors: vi.fn(),
  findWorkShifts: vi.fn(),
  replaceWorkShifts: vi.fn(),
}));

vi.mock('../src/repositories/user.repository', () => ({
  findByEmail: vi.fn(),
}));

vi.mock('../src/utils/hash', () => ({
  hashPassword: vi.fn(),
}));

const doctor: Doctor = {
  id: 3,
  crm: 'CRM-SC-54321',
  user: {
    id: 'user-id',
    name: 'Dra. Helena Souza',
    email: 'helena@example.com',
    password: 'hashed-password',
    roles: [UserRole.DOCTOR],
    createdAt: new Date(),
  },
};

describe('doctor service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates a doctor and its access user with the doctor role', async () => {
    vi.mocked(UserRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(DoctorRepository.findByCrm).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue('hashed-password');
    vi.mocked(DoctorRepository.createDoctorWithUser).mockResolvedValue(doctor);

    await expect(
      createDoctor({
        name: 'Dra. Helena Souza',
        email: 'helena@example.com',
        password: 'plain-password',
        crm: 'CRM-SC-54321',
      }),
    ).resolves.toEqual({
      id: 3,
      crm: 'CRM-SC-54321',
      user: {
        id: 'user-id',
        name: 'Dra. Helena Souza',
        email: 'helena@example.com',
        roles: [UserRole.DOCTOR],
      },
    });
    expect(DoctorRepository.createDoctorWithUser).toHaveBeenCalledWith({
      name: 'Dra. Helena Souza',
      email: 'helena@example.com',
      password: 'hashed-password',
      crm: 'CRM-SC-54321',
    });
  });

  it('rejects duplicate email and CRM', async () => {
    vi.mocked(UserRepository.findByEmail).mockResolvedValue({
      id: 'user-id',
      name: 'Existing',
      email: 'helena@example.com',
      password: 'hashed',
      roles: [UserRole.ADMIN],
      createdAt: new Date(),
    });
    await expect(
      createDoctor({
        name: 'Dra. Helena Souza',
        email: 'helena@example.com',
        password: 'secret',
        crm: 'CRM-SC-54321',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_JA_CADASTRADO',
    });
    vi.mocked(UserRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(DoctorRepository.findByCrm).mockResolvedValue(doctor);
    await expect(
      createDoctor({
        name: 'Dra. Helena Souza',
        email: 'new@example.com',
        password: 'secret',
        crm: 'CRM-SC-54321',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CRM_JA_CADASTRADO',
    });
  });

  it('maps concurrent CRM conflicts and rethrows unrelated failures', async () => {
    vi.mocked(UserRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(DoctorRepository.findByCrm)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(doctor);
    vi.mocked(DoctorRepository.createDoctorWithUser).mockRejectedValue(
      new QueryFailedError(
        'INSERT INTO doctors',
        [],
        Object.assign(new Error('duplicate key'), {
          code: '23505',
          constraint: 'UQ_doctors_crm',
        }),
      ),
    );

    await expect(
      createDoctor({
        name: 'New Doctor',
        email: 'new@example.com',
        password: 'secret',
        crm: 'CRM-SC-54321',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CRM_JA_CADASTRADO',
    });

    const failure = new Error('database unavailable');
    vi.mocked(DoctorRepository.findByCrm).mockResolvedValue(null);
    vi.mocked(DoctorRepository.createDoctorWithUser).mockRejectedValue(failure);
    await expect(
      createDoctor({
        name: 'New Doctor',
        email: 'new@example.com',
        password: 'secret',
        crm: 'CRM-SC-54321',
      }),
    ).rejects.toBe(failure);
  });

  it('validates required doctor fields and rejects invalid doctor ids', async () => {
    await expect(
      createDoctor({
        name: '',
        email: 'invalid',
        password: '',
        crm: '',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(getDoctor('not-an-id')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('rejects overlapping shifts on the same weekday', async () => {
    await expect(
      replaceWorkSchedule(3, {
        shifts: [
          {
            weekDay: 2,
            startTime: '08:00',
            endTime: '12:00',
            slotDurationMinutes: 30,
          },
          {
            weekDay: 2,
            startTime: '11:00',
            endTime: '14:00',
            slotDurationMinutes: 30,
          },
        ],
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'DADOS_INVALIDOS' });
    expect(DoctorRepository.replaceWorkShifts).not.toHaveBeenCalled();
  });

  it('accepts touching shifts and formats returned clock times', async () => {
    vi.mocked(DoctorRepository.findById).mockResolvedValue(doctor);
    vi.mocked(DoctorRepository.replaceWorkShifts).mockResolvedValue([
      {
        id: 1,
        doctor,
        weekDay: 2,
        startTime: '08:00:00',
        endTime: '12:00:00',
        slotDurationMinutes: 30,
      },
      {
        id: 2,
        doctor,
        weekDay: 2,
        startTime: '12:00:00',
        endTime: '14:00:00',
        slotDurationMinutes: 20,
      },
    ]);

    await expect(
      replaceWorkSchedule(3, {
        shifts: [
          {
            weekDay: 2,
            startTime: '08:00',
            endTime: '12:00',
            slotDurationMinutes: 30,
          },
          {
            weekDay: 2,
            startTime: '12:00',
            endTime: '14:00',
            slotDurationMinutes: 20,
          },
        ],
      }),
    ).resolves.toEqual({
      shifts: [
        {
          weekDay: 2,
          startTime: '08:00',
          endTime: '12:00',
          slotDurationMinutes: 30,
        },
        {
          weekDay: 2,
          startTime: '12:00',
          endTime: '14:00',
          slotDurationMinutes: 20,
        },
      ],
    });
  });

  it('rejects invalid shifts and unknown doctors', async () => {
    await expect(
      replaceWorkSchedule(3, {
        shifts: [
          {
            weekDay: 7,
            startTime: '08:00',
            endTime: '12:00',
            slotDurationMinutes: 30,
          },
        ],
      }),
    ).rejects.toMatchObject({ statusCode: 400 });

    vi.mocked(DoctorRepository.findById).mockResolvedValue(null);
    await expect(getDoctor('999')).rejects.toMatchObject({ statusCode: 404 });
    await expect(getWorkSchedule(999)).rejects.toBeInstanceOf(AppError);
  });

  it('validates time format, duration, start/end order, and missing shifts', async () => {
    for (const invalidShift of [
      {
        weekDay: 2,
        startTime: '8:00',
        endTime: '12:00',
        slotDurationMinutes: 30,
      },
      {
        weekDay: 2,
        startTime: '12:00',
        endTime: '12:00',
        slotDurationMinutes: 30,
      },
      {
        weekDay: 2,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationMinutes: 0,
      },
    ]) {
      await expect(
        replaceWorkSchedule(3, { shifts: [invalidShift] }),
      ).rejects.toMatchObject({ statusCode: 400 });
    }

    await expect(
      replaceWorkSchedule(3, null as unknown as WorkScheduleDTO),
    ).rejects.toMatchObject({ statusCode: 400 });
    vi.mocked(DoctorRepository.findById).mockResolvedValue(doctor);
    vi.mocked(DoctorRepository.replaceWorkShifts).mockResolvedValue([]);
    await expect(
      replaceWorkSchedule(3, { shifts: [] }),
    ).resolves.toEqual({ shifts: [] });
  });

  it('returns an empty schedule for doctors without shifts', async () => {
    vi.mocked(DoctorRepository.findById).mockResolvedValue(doctor);
    vi.mocked(DoctorRepository.findWorkShifts).mockResolvedValue([]);

    await expect(getWorkSchedule('3')).resolves.toEqual({ shifts: [] });
  });

  it('returns a paginated doctor list filtered by name', async () => {
    vi.mocked(DoctorRepository.listDoctors).mockResolvedValue({
      data: [doctor],
      total: 1,
    });

    await expect(
      listDoctors({ page: '1', pageSize: '10', name: 'Helena' }),
    ).resolves.toMatchObject({
      meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
    });
    expect(DoctorRepository.listDoctors).toHaveBeenCalledWith(1, 10, 'Helena');
  });
});
