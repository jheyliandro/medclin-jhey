import { Request, Response, NextFunction } from 'express';
import * as UserService from '../services/user.service';
import { CreateUserDTO } from '../dtos/auth.dto';

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const user = await UserService.getMe(userId);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await UserService.createUser(req.body as CreateUserDTO);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}
