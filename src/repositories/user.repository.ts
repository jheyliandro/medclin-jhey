import { AppDataSource } from '../database/data-source';
import { User } from '../entities/User';
import { CreateUserDTO } from '../dtos/auth.dto';

const userRepo = () => AppDataSource.getRepository(User);

export async function findByEmail(email: string): Promise<User | null> {
  return userRepo().findOneBy({ email });
}

export async function findById(id: string): Promise<User | null> {
  return userRepo().findOneBy({ id });
}

export async function createUser(dto: CreateUserDTO): Promise<User> {
  const user = userRepo().create({
    name: dto.name,
    email: dto.email,
    password: dto.password,
    roles: dto.roles,
  });
  return userRepo().save(user);
}
