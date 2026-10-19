export interface CreatePatientDTO {
  name: string;
  cpf: string;
}

export interface UpdatePatientDTO {
  name?: string;
}

export interface PatientResponseDTO {
  id: number;
  name: string;
  cpf: string;
  createdAt: Date;
}
