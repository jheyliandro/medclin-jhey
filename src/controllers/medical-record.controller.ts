import { Request, Response, NextFunction } from 'express';
import * as MedicalRecordService from '../services/medical-record.service';

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const record = await MedicalRecordService.createMedicalRecord(
      req.params.patientId,
      req.body?.text,
      req.user!,
    );
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const records = await MedicalRecordService.listMedicalRecords(
      req.params.patientId,
      { page: req.query.page, pageSize: req.query.pageSize },
      req.user!,
    );
    res.status(200).json(records);
  } catch (err) {
    next(err);
  }
}
