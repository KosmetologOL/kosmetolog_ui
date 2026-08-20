import { NextFunction, Request, Response } from "express";
import * as CategoriesService from "../services/categories.service";
import ApiError from "../utils/ApiError";

export const getCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const categories = await CategoriesService.listCategories();
    res.json({ categories });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, showNameInReport, reportPosition, importantNote } = req.body;
    const category = await CategoriesService.createCategory(
      name,
      showNameInReport,
      reportPosition,
      importantNote,
    );
    res.status(201).json({ category });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { name, showNameInReport, reportPosition, importantNote } = req.body;
    const category = await CategoriesService.updateCategory(
      id,
      name,
      showNameInReport,
      reportPosition,
      importantNote,
    );
    res.json({ category });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    await CategoriesService.deleteCategory(id);
    res.json({ message: "Категорія видалена" });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const listCategoryItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { categoryId } = req.params;
    const items = await CategoriesService.listCategoryItems(categoryId);
    res.json({ items });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const createCategoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { categoryId } = req.params;
    const { name, recommendation } = req.body;
    const item = await CategoriesService.createCategoryItem(
      categoryId,
      name,
      recommendation,
    );
    res.status(201).json({ item });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const updateCategoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { itemId } = req.params;
    const { name, recommendation } = req.body;
    const item = await CategoriesService.updateCategoryItem(
      itemId,
      name,
      recommendation,
    );
    res.json({ item });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const deleteCategoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { itemId } = req.params;
    await CategoriesService.deleteCategoryItem(itemId);
    res.json({ message: "Елемент видалено" });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};
