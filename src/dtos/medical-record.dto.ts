export interface CreateMedicalRecordDTO {
  text: string;
}

export interface MedicalRecordResponseDTO {
  id: number;
  patientId: number;
  doctorId: number;
  text: string;
  createdAt: Date;
}
