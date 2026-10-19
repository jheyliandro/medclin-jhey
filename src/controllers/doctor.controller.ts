import { Request, Response, NextFunction } from 'express';
import * as DoctorService from '../services/doctor.service';
import { CreateDoctorDTO, WorkScheduleDTO } from '../dtos/doctor.dto';

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const doctor = await DoctorService.createDoctor(req.body as CreateDoctorDTO);
    res.status(201).json(doctor);
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
    const result = await DoctorService.listDoctors({
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
    const doctor = await DoctorService.getDoctor(req.params.id);
    res.status(200).json(doctor);
  } catch (err) {
    next(err);
  }
}

export async function replaceWorkSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const schedule = await DoctorService.replaceWorkSchedule(
      req.params.doctorId,
      req.body as WorkScheduleDTO,
    );
    res.status(200).json(schedule);
  } catch (err) {
    next(err);
  }
}

export async function getWorkSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const schedule = await DoctorService.getWorkSchedule(
      req.params.doctorId,
    );
    res.status(200).json(schedule);
  } catch (err) {
    next(err);
  }
}
