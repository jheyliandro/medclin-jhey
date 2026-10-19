import { Router } from 'express';
import * as PatientController from '../controllers/patient.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import { UserRole } from '../entities/User';
import * as MedicalRecordController from '../controllers/medical-record.controller';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SECRETARY),
  PatientController.create,
);
router.get('/', authenticate, PatientController.list);
router.get('/:id', authenticate, PatientController.getById);
router.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SECRETARY),
  PatientController.update,
);
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  PatientController.remove,
);
router.post(
  '/:patientId/medical-records',
  authenticate,
  authorize(UserRole.DOCTOR),
  MedicalRecordController.create,
);
router.get(
  '/:patientId/medical-records',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.ADMIN),
  MedicalRecordController.list,
);

export default router;
