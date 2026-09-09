import { AppDataSource } from '../database/data-source';
import { User, UserRole } from '../entities/User';
import { RegisterDTO } from '../dtos/auth.dto';

const userRepo = () => AppDataSource.getRepository(User);

export async function findByEmail(email: string): Promise<User | null> {
  return userRepo().findOneBy({ email });
}

export async function findById(id: string): Promise<User | null> {
  return userRepo().findOneBy({ id });
}

export async function createUser(dto: RegisterDTO): Promise<User> {
  const user = userRepo().create({
    name: dto.name,
    email: dto.email,
    password: dto.password,
    role: dto.role ?? UserRole.ADMIN,
  });
  return userRepo().save(user);
}
