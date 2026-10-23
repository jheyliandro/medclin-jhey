import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from './data-source';
import { Doctor } from '../entities/Doctor';
import { Patient } from '../entities/Patient';
import { User, UserRole } from '../entities/User';
import { hashPassword } from '../utils/hash';

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  crm?: string;
}

const seedPatients = [
  { name: 'Paciente Demonstração 01', cpf: '00000000001' },
  { name: 'Paciente Demonstração 02', cpf: '00000000002' },
  { name: 'Paciente Demonstração 03', cpf: '00000000003' },
  { name: 'Paciente Demonstração 04', cpf: '00000000004' },
  { name: 'Paciente Demonstração 05', cpf: '00000000005' },
  { name: 'Paciente Demonstração 06', cpf: '00000000006' },
  { name: 'Paciente Demonstração 07', cpf: '00000000007' },
  { name: 'Paciente Demonstração 08', cpf: '00000000008' },
  { name: 'Paciente Demonstração 09', cpf: '00000000009' },
  { name: 'Paciente Demonstração 10', cpf: '00000000010' },
];

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} deve estar configurada para executar o seed.`);
  }
  return value;
}

function getSeedUsers(): SeedUser[] {
  return [
    {
      name: requiredEnvironmentVariable('ADMIN_NAME'),
      email: requiredEnvironmentVariable('ADMIN_EMAIL'),
      password: requiredEnvironmentVariable('ADMIN_PASSWORD'),
      role: UserRole.ADMIN,
    },
    {
      name: requiredEnvironmentVariable('SEED_SECRETARY_1_NAME'),
      email: requiredEnvironmentVariable('SEED_SECRETARY_1_EMAIL'),
      password: requiredEnvironmentVariable('SEED_SECRETARY_1_PASSWORD'),
      role: UserRole.SECRETARY,
    },
    {
      name: requiredEnvironmentVariable('SEED_SECRETARY_2_NAME'),
      email: requiredEnvironmentVariable('SEED_SECRETARY_2_EMAIL'),
      password: requiredEnvironmentVariable('SEED_SECRETARY_2_PASSWORD'),
      role: UserRole.SECRETARY,
    },
    {
      name: requiredEnvironmentVariable('SEED_DOCTOR_1_NAME'),
      email: requiredEnvironmentVariable('SEED_DOCTOR_1_EMAIL'),
      password: requiredEnvironmentVariable('SEED_DOCTOR_1_PASSWORD'),
      role: UserRole.DOCTOR,
      crm: requiredEnvironmentVariable('SEED_DOCTOR_1_CRM'),
    },
    {
      name: requiredEnvironmentVariable('SEED_DOCTOR_2_NAME'),
      email: requiredEnvironmentVariable('SEED_DOCTOR_2_EMAIL'),
      password: requiredEnvironmentVariable('SEED_DOCTOR_2_PASSWORD'),
      role: UserRole.DOCTOR,
      crm: requiredEnvironmentVariable('SEED_DOCTOR_2_CRM'),
    },
  ];
}

async function ensureUser(seedUser: SeedUser): Promise<User> {
  const users = AppDataSource.getRepository(User);
  let user = await users.findOneBy({ email: seedUser.email });

  if (!user) {
    await users
      .createQueryBuilder()
      .insert()
      .values({
        name: seedUser.name,
        email: seedUser.email,
        password: await hashPassword(seedUser.password),
        roles: [seedUser.role],
      })
      .orIgnore()
      .execute();
    user = await users.findOneBy({ email: seedUser.email });
  }

  if (!user) {
    throw new Error(`Não foi possível criar ou localizar ${seedUser.email}.`);
  }
  if (!user.roles.includes(seedUser.role)) {
    throw new Error(
      `A conta ${seedUser.email} já existe sem o perfil ${seedUser.role}.`,
    );
  }

  return user;
}

async function ensureDoctorProfile(
  user: User,
  crm: string,
): Promise<void> {
  const doctors = AppDataSource.getRepository(Doctor);
  const existing = await doctors.findOne({ where: { user: { id: user.id } } });
  if (existing) {
    return;
  }

  await doctors
    .createQueryBuilder()
    .insert()
    .values({ crm, user })
    .orIgnore()
    .execute();

  const doctor = await doctors.findOne({ where: { user: { id: user.id } } });
  if (!doctor) {
    throw new Error(
      `Não foi possível associar o CRM ${crm} à conta ${user.email}.`,
    );
  }
}

async function ensureSeedPatients(): Promise<void> {
  const patients = AppDataSource.getRepository(Patient);
  let count = await patients.count();

  for (const seedPatient of seedPatients) {
    if (count >= 10) {
      break;
    }

    const result = await patients
      .createQueryBuilder()
      .insert()
      .values(seedPatient)
      .orIgnore()
      .returning(['id'])
      .execute();

    if (result.raw.length > 0) {
      count += 1;
    }
  }

  count = await patients.count();
  if (count < 10) {
    throw new Error(
      'O seed não conseguiu garantir a existência de pelo menos 10 pacientes.',
    );
  }
}

async function seed(): Promise<void> {
  const seedUsers = getSeedUsers();
  await AppDataSource.initialize();

  try {
    for (const seedUser of seedUsers) {
      const user = await ensureUser(seedUser);
      if (seedUser.crm) {
        await ensureDoctorProfile(user, seedUser.crm);
      }
    }

    await ensureSeedPatients();
    console.log('Seed concluído: administrador, usuários e pacientes verificados.');
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error('Falha ao executar seed inicial:', error);
  process.exitCode = 1;
});
