import { AppDataSource } from '../database/data-source';
import { Appointment, AppointmentStatus } from '../entities/Appointment';
import { Doctor } from '../entities/Doctor';
import { Patient } from '../entities/Patient';

export type CreateAppointmentResult =
  | { kind: 'created'; appointment: Appointment }
  | { kind: 'doctor-not-found' }
  | { kind: 'patient-not-found' }
  | { kind: 'doctor-unavailable' }
  | { kind: 'patient-unavailable' };

export async function createAtomically(input: {
  doctorId: number;
  patientId: number;
  startsAt: Date;
  endsAt: Date;
}): Promise<CreateAppointmentResult> {
  return AppDataSource.transaction(async (manager) => {
    const doctor = await manager.getRepository(Doctor).findOne({
      where: { id: input.doctorId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!doctor) {
      return { kind: 'doctor-not-found' };
    }

    const patient = await manager
      .getRepository(Patient)
      .findOneBy({ id: input.patientId });
    if (!patient) {
      return { kind: 'patient-not-found' };
    }

    const appointments = manager.getRepository(Appointment);
    const doctorConflict = await appointments
      .createQueryBuilder('appointment')
      .where('appointment.doctor_id = :doctorId', {
        doctorId: input.doctorId,
      })
      .andWhere('appointment.status <> :cancelled', {
        cancelled: AppointmentStatus.CANCELLED,
      })
      .andWhere('appointment.starts_at < :endsAt', {
        endsAt: input.endsAt,
      })
      .andWhere('appointment.ends_at > :startsAt', {
        startsAt: input.startsAt,
      })
      .getOne();
    if (doctorConflict) {
      return { kind: 'doctor-unavailable' };
    }

    const patientConflict = await appointments
      .createQueryBuilder('appointment')
      .where('appointment.patient_id = :patientId', {
        patientId: input.patientId,
      })
      .andWhere('appointment.status <> :cancelled', {
        cancelled: AppointmentStatus.CANCELLED,
      })
      .andWhere('appointment.starts_at < :endsAt', {
        endsAt: input.endsAt,
      })
      .andWhere('appointment.ends_at > :startsAt', {
        startsAt: input.startsAt,
      })
      .getOne();
    if (patientConflict) {
      return { kind: 'patient-unavailable' };
    }

    const appointment = appointments.create({
      doctor,
      patient,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: AppointmentStatus.SCHEDULED,
    });
    return {
      kind: 'created',
      appointment: await appointments.save(appointment),
    };
  });
}

export async function findCalendarAppointments(
  doctorId: number,
  from: Date,
  toExclusive: Date,
): Promise<Appointment[]> {
  return AppDataSource.getRepository(Appointment)
    .createQueryBuilder('appointment')
    .innerJoinAndSelect('appointment.doctor', 'doctor')
    .innerJoinAndSelect('appointment.patient', 'patient')
    .where('appointment.doctor_id = :doctorId', { doctorId })
    .andWhere('appointment.status <> :cancelled', {
      cancelled: AppointmentStatus.CANCELLED,
    })
    .andWhere('appointment.starts_at < :toExclusive', { toExclusive })
    .andWhere('appointment.ends_at > :from', { from })
    .orderBy('appointment.starts_at', 'ASC')
    .getMany();
}

export async function findById(id: number): Promise<Appointment | null> {
  return AppDataSource.getRepository(Appointment).findOne({
    where: { id },
    relations: { doctor: { user: true }, patient: true },
  });
}

export async function listAppointments(filters: {
  doctorId?: number;
  patientId?: number;
  status?: AppointmentStatus;
  from?: Date;
  toExclusive?: Date;
  page: number;
  pageSize: number;
}): Promise<{ data: Appointment[]; total: number }> {
  const query = AppDataSource.getRepository(Appointment)
    .createQueryBuilder('appointment')
    .innerJoinAndSelect('appointment.doctor', 'doctor')
    .innerJoinAndSelect('doctor.user', 'user')
    .innerJoinAndSelect('appointment.patient', 'patient');

  if (filters.doctorId !== undefined) {
    query.andWhere('appointment.doctor_id = :doctorId', {
      doctorId: filters.doctorId,
    });
  }
  if (filters.patientId !== undefined) {
    query.andWhere('appointment.patient_id = :patientId', {
      patientId: filters.patientId,
    });
  }
  if (filters.status !== undefined) {
    query.andWhere('appointment.status = :status', {
      status: filters.status,
    });
  }
  if (filters.from) {
    query.andWhere('appointment.starts_at >= :from', {
      from: filters.from,
    });
  }
  if (filters.toExclusive) {
    query.andWhere('appointment.starts_at < :toExclusive', {
      toExclusive: filters.toExclusive,
    });
  }

  const [data, total] = await query
    .orderBy('appointment.starts_at', 'ASC')
    .skip((filters.page - 1) * filters.pageSize)
    .take(filters.pageSize)
    .getManyAndCount();
  return { data, total };
}
