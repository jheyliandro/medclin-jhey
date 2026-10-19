import { Router } from 'express';
import * as UserController from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import { UserRole } from '../entities/User';

const router = Router();

router.post('/', authenticate, authorize(UserRole.ADMIN), UserController.create);
router.get('/me', authenticate, UserController.me);

export default router;
