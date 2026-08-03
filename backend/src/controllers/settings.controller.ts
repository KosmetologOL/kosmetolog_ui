import { NextFunction, Request, Response } from "express";
import * as SettingsService from "../services/settings.service";
import ApiError from "../utils/ApiError";

export const getSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const settings = await SettingsService.getSettings();
    res.json(settings);
  } catch {
    next(ApiError.internal("Не вдалося отримати налаштування"));
  }
};

export const updateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const settings = await SettingsService.updateSettings(req.body);
    res.json(settings);
  } catch {
    next(ApiError.internal("Не вдалося оновити налаштування"));
  }
};
