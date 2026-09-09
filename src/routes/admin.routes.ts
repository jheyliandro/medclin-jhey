import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import { UserRole } from '../entities/User';

const router = Router();

router.get(
  '/ping',
  authenticate,
  authorize(UserRole.ADMIN),
  (req: Request, res: Response) => {
    res.status(200).json({ message: 'pong', role: req.user!.role });
  },
);

export default router;
