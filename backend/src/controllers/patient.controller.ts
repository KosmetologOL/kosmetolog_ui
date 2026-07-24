import { NextFunction, Request, Response } from "express";
import * as PatientService from "../services/patient.service";
import * as ReportService from "../services/reports.service";
import ApiError from "../utils/ApiError";
import { escapeRegex } from "../utils/regex";

export const getAllPatients = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const query = (req.query.query as string)?.trim() || "";

  try {
    const filter = query
      ? { fullName: { $regex: escapeRegex(query), $options: "i" } }
      : {};

    const total = await PatientService.count(filter);
    const patients = await PatientService.getAll(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const lastVisitMap = await ReportService.getLastVisitMap(
      patients.map((p) => String(p._id)),
    );
    const patientsWithVisit = patients.map((p) => ({
      ...p.toObject(),
      lastVisitAt: lastVisitMap.get(String(p._id)) ?? p.createdAt,
    }));

    res.json({
      patients: patientsWithVisit,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    next(ApiError.internal("Помилка сервера"));
  }
};

export const getPatientById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const patient = await PatientService.getOne(req.params.id);
    if (!patient) return next(ApiError.notFound("Пацієнт не знайдено"));
    res.json(patient);
  } catch (err) {
    console.error(err);
    next(ApiError.internal("Помилка сервера"));
  }
};

export const createPatient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const patient = await PatientService.create(req.body);
    res.status(201).json(patient);
  } catch (err) {
    console.error(err);
    next(ApiError.internal("Помилка сервера"));
  }
};

export const updatePatient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const patient = await PatientService.update(req.params.id, req.body);
    if (!patient) return next(ApiError.notFound("Пацієнт не знайдено"));
    res.json(patient);
  } catch (err) {
    console.error(err);
    next(ApiError.internal("Помилка при оновленні пацієнта"));
  }
};
export const deletePatient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const patient = await PatientService.remove(req.params.id);
    if (!patient) return next(ApiError.notFound("Пацієнт не знайдено"));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    next(ApiError.internal("Помилка при видаленні пацієнта"));
  }
};
