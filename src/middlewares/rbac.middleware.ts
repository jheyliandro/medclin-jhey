import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../entities/User';
import { AppError } from '../utils/AppError';

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Não autenticado.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Acesso negado: permissão insuficiente.', 403),
      );
    }

    next();
  };
}
