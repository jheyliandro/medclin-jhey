import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Appointment,
  AppointmentStatus,
} from '../src/entities/Appointment';
import { Doctor } from '../src/entities/Doctor';
import { Patient } from '../src/entities/Patient';
import { UserRole } from '../src/entities/User';
import * as AppointmentRepository from '../src/repositories/appointment.repository';
import * as DoctorRepository from '../src/repositories/doctor.repository';
import * as PatientRepository from '../src/repositories/patient.repository';
import { AppError } from '../src/utils/AppError';
import {
  createAppointment,
  changeAppointmentStatus,
  getAppointment,
  getDoctorCalendar,
  listAppointments,
} from '../src/services/appointment.service';

vi.mock('../src/repositories/appointment.repository', () => ({
  createAtomically: vi.fn(),
  findCalendarAppointments: vi.fn(),
  findById: vi.fn(),
  listAppointments: vi.fn(),
  saveStatus: vi.fn(),
  hasClinicalRelationship: vi.fn(),
}));

vi.mock('../src/repositories/doctor.repository', () => ({
  findById: vi.fn(),
  findByUserId: vi.fn(),
  findWorkShifts: vi.fn(),
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

const appointment: Appointment = {
  id: 41,
  doctor,
  patient,
  startsAt: new Date('2026-10-20T11:00:00.000Z'),
  endsAt: new Date('2026-10-20T11:30:00.000Z'),
  status: AppointmentStatus.SCHEDULED,
};

const shift = {
  id: 1,
  doctor,
  weekDay: 2,
  startTime: '08:00:00',
  endTime: '12:00:00',
  slotDurationMinutes: 30,
};

describe('appointment service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(DoctorRepository.findById).mockResolvedValue(doctor);
    vi.mocked(PatientRepository.findById).mockResolvedValue(patient);
    vi.mocked(DoctorRepository.findWorkShifts).mockResolvedValue([shift]);
  });

  it('creates an appointment from the local work schedule', async () => {
    vi.mocked(AppointmentRepository.createAtomically).mockResolvedValue({
      kind: 'created',
      appointment,
    });

    await expect(
      createAppointment({
        doctorId: 3,
        patientId: 10,
        startsAt: '2026-10-20T08:00:00-03:00',
      }),
    ).resolves.toEqual({
      id: 41,
      doctorId: 3,
      patientId: 10,
      startsAt: '2026-10-20T11:00:00.000Z',
      endsAt: '2026-10-20T11:30:00.000Z',
      status: AppointmentStatus.SCHEDULED,
    });
    expect(AppointmentRepository.createAtomically).toHaveBeenCalledWith({
      doctorId: 3,
      patientId: 10,
      startsAt: new Date('2026-10-20T11:00:00.000Z'),
      endsAt: new Date('2026-10-20T11:30:00.000Z'),
    });
  });

  it('rejects times outside the schedule, off-grid, or too close to shift end', async () => {
    for (const startsAt of [
      '2026-10-20T07:00:00-03:00',
      '2026-10-20T08:15:00-03:00',
      '2026-10-20T11:45:00-03:00',
      '2026-10-20T12:00:00-03:00',
    ]) {
      await expect(
        createAppointment({ doctorId: 3, patientId: 10, startsAt }),
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'HORARIO_FORA_DA_ESCALA',
      });
    }
    expect(AppointmentRepository.createAtomically).not.toHaveBeenCalled();
  });

  it('returns separate conflicts for doctor and patient availability', async () => {
    vi.mocked(AppointmentRepository.createAtomically)
      .mockResolvedValueOnce({ kind: 'doctor-unavailable' })
      .mockResolvedValueOnce({ kind: 'patient-unavailable' });
    const dto = {
      doctorId: 3,
      patientId: 10,
      startsAt: '2026-10-20T08:00:00-03:00',
    };

    await expect(createAppointment(dto)).rejects.toMatchObject({
      statusCode: 409,
      code: 'HORARIO_INDISPONIVEL',
    });
    await expect(createAppointment(dto)).rejects.toMatchObject({
      statusCode: 409,
      code: 'PACIENTE_INDISPONIVEL',
    });
  });

  it('validates required resources and timestamp format', async () => {
    vi.mocked(DoctorRepository.findById).mockResolvedValue(null);
    await expect(
      createAppointment({
        doctorId: 3,
        patientId: 10,
        startsAt: '2026-10-20T08:00:00-03:00',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });

    vi.mocked(DoctorRepository.findById).mockResolvedValue(doctor);
    await expect(
      createAppointment({
        doctorId: 3,
        patientId: 10,
        startsAt: '2026-02-31T08:00:00-03:00',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns the calendar in the clinic local-date range', async () => {
    vi.mocked(AppointmentRepository.findCalendarAppointments).mockResolvedValue([
      appointment,
    ]);

    const result = await getDoctorCalendar(3, '2026-10-20', '2026-10-20');
    expect(result.workSchedule.shifts).toEqual([
      {
        weekDay: 2,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationMinutes: 30,
      },
    ]);
    expect(result.appointments[0].startsAt).toBe(
      '2026-10-20T11:00:00.000Z',
    );
    expect(AppointmentRepository.findCalendarAppointments).toHaveBeenCalledWith(
      3,
      new Date('2026-10-20T03:00:00.000Z'),
      new Date('2026-10-21T03:00:00.000Z'),
    );
  });

  it('rejects invalid calendar date intervals', async () => {
    await expect(
      getDoctorCalendar(3, '2026-10-20', '2026-09-30'),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getDoctorCalendar(3, '2026-10-01', '2026-11-01'),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getDoctorCalendar(3, '2026-02-30', '2026-02-30'),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('forces doctors to list only their own appointments', async () => {
    vi.mocked(DoctorRepository.findByUserId).mockResolvedValue(doctor);
    vi.mocked(AppointmentRepository.listAppointments).mockResolvedValue({
      data: [appointment],
      total: 1,
    });

    await listAppointments(
      { doctorId: '99', patientId: '10', status: 'scheduled' },
      { id: 'doctor-user-id', roles: [UserRole.DOCTOR] },
    );
    expect(AppointmentRepository.listAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ doctorId: 3, patientId: 10 }),
    );
  });

  it('rejects invalid appointment filters', async () => {
    await expect(
      listAppointments(
        { status: 'unknown' },
        { id: 'admin-id', roles: [UserRole.ADMIN] },
      ),
    ).rejects.toMatchObject({ statusCode: 400, code: 'DADOS_INVALIDOS' });
  });

  it('denies a doctor access to another doctor appointment', async () => {
    vi.mocked(AppointmentRepository.findById).mockResolvedValue(appointment);

    await expect(
      getAppointment(41, { id: 'other-user', roles: [UserRole.DOCTOR] }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'ACESSO_NEGADO' });
  });

  it('allows the assigned doctor to start an appointment', async () => {
    vi.mocked(AppointmentRepository.findById).mockResolvedValue(appointment);
    vi.mocked(AppointmentRepository.saveStatus).mockImplementation(
      async (_appointment, status) => ({ ...appointment, status }),
    );

    const started = await changeAppointmentStatus(41, 'in_progress', {
      id: 'doctor-user-id',
      roles: [UserRole.DOCTOR],
    });
    expect(started.status).toBe(AppointmentStatus.IN_PROGRESS);
  });

  it('distinguishes invalid transitions from missing authority', async () => {
    vi.mocked(AppointmentRepository.findById).mockResolvedValue(appointment);

    await expect(
      changeAppointmentStatus(41, 'done', {
        id: 'doctor-user-id',
        roles: [UserRole.DOCTOR],
      }),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'TRANSICAO_INVALIDA',
    });
    await expect(
      changeAppointmentStatus(41, 'in_progress', {
        id: 'other-user',
        roles: [UserRole.DOCTOR],
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'ACESSO_NEGADO' });
  });
});
