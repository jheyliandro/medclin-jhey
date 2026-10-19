import { Request, Response, NextFunction } from 'express';
import * as AppointmentService from '../services/appointment.service';
import { CreateAppointmentDTO } from '../dtos/appointment.dto';

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const appointment = await AppointmentService.createAppointment(
      req.body as CreateAppointmentDTO,
    );
    res.status(201).json(appointment);
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
    const result = await AppointmentService.listAppointments(
      {
        doctorId: req.query.doctorId,
        patientId: req.query.patientId,
        status: req.query.status,
        from: req.query.from,
        to: req.query.to,
        page: req.query.page,
        pageSize: req.query.pageSize,
      },
      req.user!,
    );
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
    const appointment = await AppointmentService.getAppointment(
      req.params.id,
      req.user!,
    );
    res.status(200).json(appointment);
  } catch (err) {
    next(err);
  }
}
