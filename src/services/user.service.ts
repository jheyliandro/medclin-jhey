import { UserResponseDTO } from '../dtos/auth.dto';
import * as UserRepository from '../repositories/user.repository';
import { AppError } from '../utils/AppError';

export async function getMe(userId: string): Promise<UserResponseDTO> {
  const user = await UserRepository.findById(userId);

  if (!user) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
