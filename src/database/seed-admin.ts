import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from './data-source';
import { User, UserRole } from '../entities/User';
import { hashPassword } from '../utils/hash';

async function seedAdmin(): Promise<void> {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      'ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD devem estar configurados.',
    );
  }

  await AppDataSource.initialize();

  try {
    const users = AppDataSource.getRepository(User);
    const existing = await users.findOneBy({ email });

    if (existing) {
      console.log('Administrador já existente; seed não alterou o usuário.');
      return;
    }

    const user = users.create({
      name,
      email,
      password: await hashPassword(password),
      roles: [UserRole.ADMIN],
    });
    await users.save(user);
    console.log('Administrador inicial criado.');
  } finally {
    await AppDataSource.destroy();
  }
}

seedAdmin().catch((error: unknown) => {
  console.error('Falha ao criar administrador inicial:', error);
  process.exitCode = 1;
});
