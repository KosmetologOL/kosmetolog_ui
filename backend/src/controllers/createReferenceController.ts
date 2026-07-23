import { NextFunction, Request, Response } from "express";
import ApiError from "../utils/ApiError";

interface ReferenceService<T> {
  getAll: () => Promise<T[]>;
  searchByName: (query: string) => Promise<T[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => Promise<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => Promise<T | null>;
  remove: (id: string) => Promise<T | null>;
}

export const createReferenceController = <T>(
  service: ReferenceService<T>,
  createFields: string[],
) => {
  const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await service.getAll();
      res.json(items);
    } catch (err) {
      console.error(err);
      next(ApiError.internal("Помилка сервера"));
    }
  };

  const search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query.query || req.params.query;
      if (!query || typeof query !== "string" || query.trim() === "") {
        return res.status(400).json({ message: "Помилка запиту" });
      }
      const items = await service.searchByName(query.trim());
      res.json(items);
    } catch (err) {
      console.error(err);
      next(ApiError.internal("Помилка сервера"));
    }
  };

  const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: Record<string, unknown> = {};
      for (const field of createFields) {
        data[field] = req.body[field];
      }
      const item = await service.create(data);
      res.status(201).json(item);
    } catch (err) {
      console.error(err);
      next(ApiError.badRequest("Помилка запиту"));
    }
  };

  const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data: Record<string, unknown> = {};
      for (const field of createFields) {
        data[field] = req.body[field];
      }
      const updated = await service.update(id, data);
      if (!updated) return next(ApiError.notFound("Не знайдено"));
      res.json(updated);
    } catch (err) {
      console.error(err);
      next(ApiError.internal("Помилка сервера"));
    }
  };

  const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const deleted = await service.remove(id);
      if (!deleted) return next(ApiError.notFound("Не знайдено"));
      res.json(deleted);
    } catch (err) {
      console.error(err);
      next(ApiError.internal("Помилка сервера"));
    }
  };

  return { getAll, search, create, update, remove };
};
