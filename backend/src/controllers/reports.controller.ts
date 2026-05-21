import { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as ReportService from "../services/reports.service";
import ApiError from "../utils/ApiError";

export const create = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const report = await ReportService.create(req.body, req.user);
    res.status(201).json(report);
  } catch (err) {
    console.error(err);
    next(ApiError.internal("Помилка сервера"));
  }
};

export const getAll = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const reports = await ReportService.getAll();
    res.json(reports);
  } catch (err) {
    console.error(err);
    next(ApiError.internal("Помилка сервера"));
  }
};

export const getById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const report = await ReportService.getById(req.params.id);

    if (!report) {
      return next(ApiError.notFound("Звіт не знайдено"));
    }

    res.json(report);
  } catch (err) {
    console.error(err);
    next(ApiError.internal("Помилка сервера"));
  }
};

export const getByPatientId = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const report = await ReportService.getByPatientId(req.params.patientId);

    if (!report) {
      return res.status(404).json({ message: "Звіт не знайдено" });
    }

    res.json(report);
  } catch (err) {
    console.error(err);
    next(ApiError.internal("Помилка сервера"));
  }
};

export const update = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const report = await ReportService.update(
      req.params.id,
      req.body,
      req.user,
    );

    if (!report) {
      return next(ApiError.notFound("Звіт не знайдено"));
    }

    res.json(report);
  } catch (err) {
    console.error(err);
    next(ApiError.internal("Помилка при оновленні звіту"));
  }
};
