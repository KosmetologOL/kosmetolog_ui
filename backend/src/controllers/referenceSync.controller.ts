import { NextFunction, Request, Response } from "express";
import * as ReferenceSyncService from "../services/referenceSync.service";
import ApiError from "../utils/ApiError";

export const exportReferences = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dump = await ReferenceSyncService.dumpReferences();
    res.json(dump);
  } catch (err) {
    console.error(err);
    next(ApiError.internal("Не вдалося вивантажити довідники"));
  }
};

export const previewImport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { plan } = await ReferenceSyncService.buildImportPlan(req.body.data);
    res.json(plan);
  } catch (err) {
    console.error(err);
    next(ApiError.badRequest("Не вдалося опрацювати файл імпорту"));
  }
};

export const applyImport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ReferenceSyncService.applyImport(
      req.body.data,
      Boolean(req.body.removeMissing),
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    next(
      ApiError.internal(
        "Не вдалося застосувати імпорт. Зміни скасовано — довідники лишилися без змін.",
      ),
    );
  }
};
