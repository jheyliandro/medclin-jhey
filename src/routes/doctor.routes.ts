import { Router } from 'express';
import * as DoctorController from '../controllers/doctor.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import { UserRole } from '../entities/User';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  DoctorController.create,
);
router.get('/', authenticate, DoctorController.list);
router.get(
  '/:doctorId/work-schedule',
  authenticate,
  DoctorController.getWorkSchedule,
);
router.put(
  '/:doctorId/work-schedule',
  authenticate,
  authorize(UserRole.ADMIN),
  DoctorController.replaceWorkSchedule,
);
router.get('/:id', authenticate, DoctorController.getById);

export default router;
