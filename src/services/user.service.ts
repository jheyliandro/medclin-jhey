import { CreateUserDTO, UserResponseDTO } from '../dtos/auth.dto';
import { UserRole } from '../entities/User';
import { hashPassword } from '../utils/hash';
import * as UserRepository from '../repositories/user.repository';
import { AppError } from '../utils/AppError';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getMe(userId: string): Promise<UserResponseDTO> {
  const user = await UserRepository.findById(userId);

  if (!user) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
  };
}

export async function createUser(dto: CreateUserDTO): Promise<UserResponseDTO> {
  if (
    !dto ||
    typeof dto.name !== 'string' ||
    dto.name.trim().length === 0 ||
    typeof dto.email !== 'string' ||
    !EMAIL_REGEX.test(dto.email) ||
    typeof dto.password !== 'string' ||
    dto.password.length === 0 ||
    !Array.isArray(dto.roles) ||
    dto.roles.length === 0 ||
    !dto.roles.every((role) => Object.values(UserRole).includes(role))
  ) {
    throw new AppError('Dados de usuário inválidos.', 400);
  }

  const existing = await UserRepository.findByEmail(dto.email);
  if (existing) {
    throw new AppError(
      'E-mail já cadastrado.',
      409,
      'EMAIL_JA_CADASTRADO',
    );
  }

  const created = await UserRepository.createUser({
    ...dto,
    password: await hashPassword(dto.password),
  });

  return {
    id: created.id,
    name: created.name,
    email: created.email,
    roles: created.roles,
  };
}
