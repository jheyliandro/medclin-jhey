import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityManager } from 'typeorm';
import { AppDataSource } from '../src/database/data-source';
import { Appointment } from '../src/entities/Appointment';
import { Doctor } from '../src/entities/Doctor';
import { Patient } from '../src/entities/Patient';
import { createAtomically } from '../src/repositories/appointment.repository';

vi.mock('../src/database/data-source', () => ({
  AppDataSource: { transaction: vi.fn() },
}));

describe('appointment repository concurrency protection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('locks the doctor row in the same transaction as conflict checks and insert', async () => {
    const doctor = { id: 3 };
    const patient = { id: 10 };
    const appointment = {
      id: 41,
      doctor,
      patient,
      startsAt: new Date('2026-10-20T11:00:00Z'),
      endsAt: new Date('2026-10-20T11:30:00Z'),
      status: 'scheduled',
    };
    const queryBuilder = {
      where: vi.fn(),
      andWhere: vi.fn(),
      getOne: vi.fn().mockResolvedValue(null),
    };
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);

    const doctorRepository = { findOne: vi.fn().mockResolvedValue(doctor) };
    const patientRepository = { findOneBy: vi.fn().mockResolvedValue(patient) };
    const appointmentRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
      create: vi.fn().mockReturnValue(appointment),
      save: vi.fn().mockResolvedValue(appointment),
    };
    const manager = {
      getRepository: vi.fn((entity: unknown) => {
        if (entity === Doctor) return doctorRepository;
        if (entity === Patient) return patientRepository;
        if (entity === Appointment) return appointmentRepository;
        throw new Error('Unexpected repository');
      }),
    } as unknown as EntityManager;

    const transaction = vi.fn(
      async (operation: (manager: EntityManager) => Promise<unknown>) =>
        operation(manager),
    );
    Object.defineProperty(AppDataSource, 'transaction', {
      value: transaction,
      configurable: true,
    });

    const input = {
      doctorId: 3,
      patientId: 10,
      startsAt: new Date('2026-10-20T11:00:00Z'),
      endsAt: new Date('2026-10-20T11:30:00Z'),
    };
    await expect(createAtomically(input)).resolves.toEqual({
      kind: 'created',
      appointment,
    });

    expect(doctorRepository.findOne).toHaveBeenCalledWith({
      where: { id: 3 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(transaction).toHaveBeenCalledOnce();
    expect(appointmentRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
    expect(appointmentRepository.save).toHaveBeenCalledOnce();
  });
});
