import { Router } from 'express';
import * as UserController from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/me', authenticate, UserController.me);

export default router;
