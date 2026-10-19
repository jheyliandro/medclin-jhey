import { Request, Response, NextFunction } from 'express';
import * as PatientService from '../services/patient.service';
import { CreatePatientDTO, UpdatePatientDTO } from '../dtos/patient.dto';

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const patient = await PatientService.createPatient(
      req.body as CreatePatientDTO,
    );
    res.status(201).json(patient);
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
    const result = await PatientService.listPatients({
      page: req.query.page,
      pageSize: req.query.pageSize,
      name: req.query.name,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const patient = await PatientService.getPatient(req.params.id);
    res.status(200).json(patient);
  } catch (err) {
    next(err);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const patient = await PatientService.updatePatient(
      req.params.id,
      req.body as UpdatePatientDTO,
    );
    res.status(200).json(patient);
  } catch (err) {
    next(err);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await PatientService.deletePatient(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
