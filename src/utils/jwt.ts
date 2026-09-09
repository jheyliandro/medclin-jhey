import jwt, { JwtPayload } from 'jsonwebtoken';
import { AppError } from './AppError';
import { UserRole } from '../entities/User';

export interface TokenPayload extends JwtPayload {
  id: string;
  role: UserRole;
}

export function generateToken(payload: { id: string; role: UserRole }): string {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '1d';

  if (!secret) {
    throw new AppError('JWT_SECRET não configurado.', 500);
  }

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new AppError('JWT_SECRET não configurado.', 500);
  }

  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    throw new AppError('Token inválido ou expirado.', 401);
  }
}
