import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      error: err.code,
      message: err.message,
    });
    return;
  }

  console.error('Erro inesperado:', err);
  res.status(500).json({
    statusCode: 500,
    error: 'DADOS_INVALIDOS',
    message: 'Erro interno do servidor.',
  });
}
