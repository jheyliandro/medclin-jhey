import { ILike } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Doctor } from '../entities/Doctor';
import { User, UserRole } from '../entities/User';
import { WorkShift } from '../entities/WorkShift';
import { CreateDoctorDTO, WorkShiftDTO } from '../dtos/doctor.dto';

export async function findById(id: number): Promise<Doctor | null> {
  return AppDataSource.getRepository(Doctor).findOne({
    where: { id },
    relations: { user: true },
  });
}

export async function findByCrm(crm: string): Promise<Doctor | null> {
  return AppDataSource.getRepository(Doctor).findOneBy({ crm });
}

export async function findByUserId(userId: string): Promise<Doctor | null> {
  return AppDataSource.getRepository(Doctor).findOne({
    where: { user: { id: userId } },
    relations: { user: true },
  });
}

export async function createDoctorWithUser(
  dto: CreateDoctorDTO & { password: string },
): Promise<Doctor> {
  return AppDataSource.transaction(async (manager) => {
    const userRepository = manager.getRepository(User);
    const doctorRepository = manager.getRepository(Doctor);
    const user = userRepository.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      roles: [UserRole.DOCTOR],
    });
    const savedUser = await userRepository.save(user);
    const doctor = doctorRepository.create({ crm: dto.crm, user: savedUser });
    return doctorRepository.save(doctor);
  });
}

export async function listDoctors(
  page: number,
  pageSize: number,
  name?: string,
): Promise<{ data: Doctor[]; total: number }> {
  const [data, total] = await AppDataSource.getRepository(Doctor).findAndCount({
    where: name ? { user: { name: ILike(`%${name}%`) } } : {},
    relations: { user: true },
    order: { id: 'ASC' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return { data, total };
}

export async function findWorkShifts(doctorId: number): Promise<WorkShift[]> {
  return AppDataSource.getRepository(WorkShift).find({
    where: { doctor: { id: doctorId } },
    order: { weekDay: 'ASC', startTime: 'ASC' },
  });
}

export async function replaceWorkShifts(
  doctorId: number,
  shifts: WorkShiftDTO[],
): Promise<WorkShift[] | null> {
  return AppDataSource.transaction(async (manager) => {
    const doctorRepository = manager.getRepository(Doctor);
    const doctor = await doctorRepository.findOneBy({ id: doctorId });
    if (!doctor) {
      return null;
    }

    const shiftRepository = manager.getRepository(WorkShift);
    await shiftRepository.delete({ doctor: { id: doctorId } });
    if (shifts.length === 0) {
      return [];
    }

    const entities = shifts.map((shift) =>
      shiftRepository.create({ ...shift, doctor }),
    );
    return shiftRepository.save(entities);
  });
}
