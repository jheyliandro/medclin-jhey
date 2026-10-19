import { LoginDTO } from '../dtos/auth.dto';
import * as UserRepository from '../repositories/user.repository';
import { comparePassword } from '../utils/hash';
import { generateToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

export async function login(dto: LoginDTO): Promise<{ accessToken: string }> {
  const email = dto?.email;
  const password = dto?.password;

  if (
    typeof email !== 'string' ||
    email.length === 0 ||
    typeof password !== 'string' ||
    password.length === 0
  ) {
    throw new AppError('Os campos email e password são obrigatórios.', 400);
  }

  const user = await UserRepository.findByEmail(email);

  if (!user) {
    throw new AppError('Credenciais inválidas.', 401, 'CREDENCIAIS_INVALIDAS');
  }

  const passwordMatch = await comparePassword(password, user.password);

  if (!passwordMatch) {
    throw new AppError('Credenciais inválidas.', 401, 'CREDENCIAIS_INVALIDAS');
  }

  const accessToken = generateToken({ id: user.id, roles: user.roles });
  return { accessToken };
}
