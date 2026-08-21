import { NextFunction, Request, Response } from "express";
import {
  createHomeCareService,
  deleteHomeCareService,
  getAllHomeCaresService,
  reorderHomeCaresService,
  updateHomeCareService,
} from "../services/homeCare.service";
import ApiError from "../utils/ApiError";

export const getAllHomeCares = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const search = req.query.search?.toString();
    const homeCares = await getAllHomeCaresService(search);
    res.json(homeCares);
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const createHomeCare = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const homeCare = await createHomeCareService(req.body);
    res.status(201).json(homeCare);
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const updateHomeCare = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const updatedHomeCare = await updateHomeCareService(id, req.body);
    if (!updatedHomeCare) {
      return next(ApiError.notFound("Домашній догляд не знайдено"));
    }
    res.json(updatedHomeCare);
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const deleteHomeCare = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const deletedHomeCare = await deleteHomeCareService(id);
    if (!deletedHomeCare) {
      return next(ApiError.notFound("Домашній догляд не знайдено"));
    }
    res.json(deletedHomeCare);
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const reorderHomeCares = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { ids } = req.body as { ids: string[] };
    const reorderedHomeCares = await reorderHomeCaresService(ids);
    res.json(reorderedHomeCares);
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};
