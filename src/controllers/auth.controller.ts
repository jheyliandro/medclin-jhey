import { Request, Response, NextFunction } from 'express';
import * as AuthService from '../services/auth.service';
import { LoginDTO } from '../dtos/auth.dto';

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto: LoginDTO = req.body as LoginDTO;
    const result = await AuthService.login(dto);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
