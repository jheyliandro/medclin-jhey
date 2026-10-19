import { ILike } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Patient } from '../entities/Patient';

const patientRepo = () => AppDataSource.getRepository(Patient);

export async function findById(id: number): Promise<Patient | null> {
  return patientRepo().findOneBy({ id });
}

export async function findByCpf(cpf: string): Promise<Patient | null> {
  return patientRepo().findOneBy({ cpf });
}

export async function createPatient(
  name: string,
  cpf: string,
): Promise<Patient> {
  const patient = patientRepo().create({ name, cpf });
  return patientRepo().save(patient);
}

export async function updatePatient(
  id: number,
  name: string,
): Promise<Patient | null> {
  const patient = await findById(id);
  if (!patient) {
    return null;
  }

  patient.name = name;
  return patientRepo().save(patient);
}

export async function deletePatient(id: number): Promise<boolean> {
  const result = await patientRepo().delete({ id });
  return (result.affected ?? 0) > 0;
}

export async function listPatients(
  page: number,
  pageSize: number,
  name?: string,
): Promise<{ data: Patient[]; total: number }> {
  const [data, total] = await patientRepo().findAndCount({
    where: name ? { name: ILike(`%${name}%`) } : {},
    order: { id: 'ASC' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return { data, total };
}
