import { AppDataSource } from '../database/data-source';
import { MedicalRecord } from '../entities/MedicalRecord';

const recordRepo = () => AppDataSource.getRepository(MedicalRecord);

export async function createMedicalRecord(input: {
  patientId: number;
  doctorId: number;
  text: string;
}): Promise<MedicalRecord> {
  const record = recordRepo().create({
    patient: { id: input.patientId },
    doctor: { id: input.doctorId },
    text: input.text,
  });
  return recordRepo().save(record);
}

export async function listMedicalRecords(
  patientId: number,
  page: number,
  pageSize: number,
): Promise<{ data: MedicalRecord[]; total: number }> {
  const [data, total] = await recordRepo().findAndCount({
    where: { patient: { id: patientId } },
    relations: { patient: true, doctor: true },
    order: { createdAt: 'DESC' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return { data, total };
}
