import jwt, { JwtPayload } from 'jsonwebtoken';
import { AppError } from './AppError';
import { UserRole } from '../entities/User';

export interface TokenPayload extends JwtPayload {
  id: string;
  roles: UserRole[];
}

function isUserRole(role: unknown): role is UserRole {
  return Object.values(UserRole).some((validRole) => validRole === role);
}

export function generateToken(payload: { id: string; roles: UserRole[] }): string {
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
    const payload = jwt.verify(token, secret);
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof payload.id !== 'string' ||
      !Array.isArray(payload.roles) ||
      !payload.roles.every(isUserRole)
    ) {
      throw new Error('Token payload inválido.');
    }

    return payload as TokenPayload;
  } catch {
    throw new AppError('Token inválido ou expirado.', 401);
  }
}
