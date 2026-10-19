import { Router } from 'express';
import * as AppointmentController from '../controllers/appointment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import { UserRole } from '../entities/User';

const router = Router();

router.get('/', authenticate, AppointmentController.list);
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SECRETARY),
  AppointmentController.create,
);
router.patch('/:id/status', authenticate, AppointmentController.changeStatus);
router.get('/:id', authenticate, AppointmentController.getById);

export default router;
