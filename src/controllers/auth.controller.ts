import { Request, Response, NextFunction } from 'express';
import * as AuthService from '../services/auth.service';
import { RegisterDTO, LoginDTO } from '../dtos/auth.dto';

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto: RegisterDTO = req.body as RegisterDTO;
    const user = await AuthService.register(dto);
    res.status(201).json({ message: 'Usuário criado com sucesso.', user });
  } catch (err) {
    next(err);
  }
}

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
