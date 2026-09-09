import { RegisterDTO, LoginDTO, UserResponseDTO } from '../dtos/auth.dto';
import * as UserRepository from '../repositories/user.repository';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toUserResponse(user: {
  id: string;
  name: string;
  email: string;
  role: import('../entities/User').UserRole;
  createdAt: Date;
}): UserResponseDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function register(dto: RegisterDTO): Promise<UserResponseDTO> {
  const { name, email, password, role } = dto;

  if (!name || !email || !password) {
    throw new AppError('Os campos name, email e password são obrigatórios.', 400);
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new AppError('Formato de e-mail inválido.', 400);
  }

  const existing = await UserRepository.findByEmail(email);
  if (existing) {
    throw new AppError('E-mail já cadastrado.', 409);
  }

  const hashed = await hashPassword(password);

  const created = await UserRepository.createUser({
    name,
    email,
    password: hashed,
    role,
  });

  return toUserResponse(created);
}

export async function login(dto: LoginDTO): Promise<{ token: string; user: UserResponseDTO }> {
  const { email, password } = dto;

  if (!email || !password) {
    throw new AppError('Os campos email e password são obrigatórios.', 400);
  }

  const user = await UserRepository.findByEmail(email);

  if (!user) {
    throw new AppError('Credenciais inválidas.', 401);
  }

  const passwordMatch = await comparePassword(password, user.password);

  if (!passwordMatch) {
    throw new AppError('Credenciais inválidas.', 401);
  }

  const token = generateToken({ id: user.id, role: user.role });

  return { token, user: toUserResponse(user) };
}
