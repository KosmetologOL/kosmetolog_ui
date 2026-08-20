import { NextFunction, Request, Response } from "express";
import * as DoctorsService from "../services/doctors.service";
import ApiError from "../utils/ApiError";

export const getDoctors = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const doctors = await DoctorsService.listDoctors();
    res.json({ doctors });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const setDoctorActive = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    const user = await DoctorsService.toggleUserActive(id, Boolean(active));
    res.json({ user });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const deleteDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await DoctorsService.deleteDoctor(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};
