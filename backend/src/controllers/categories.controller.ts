import { Request, Response } from "express";
import * as CategoriesService from "../services/categories.service";

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await CategoriesService.listCategories();
    res.json({ categories });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const category = await CategoriesService.createCategory(name);
    res.status(201).json({ category });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const category = await CategoriesService.updateCategory(id, name);
    res.json({ category });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await CategoriesService.deleteCategory(id);
    res.json({ message: "Категорія видалена" });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const listCategoryItems = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const items = await CategoriesService.listCategoryItems(categoryId);
    res.json({ items });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const createCategoryItem = async (req: Request, res: Response) => {
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
    res.status(400).json({ message: (err as Error).message });
  }
};

export const updateCategoryItem = async (req: Request, res: Response) => {
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
    res.status(400).json({ message: (err as Error).message });
  }
};

export const deleteCategoryItem = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    await CategoriesService.deleteCategoryItem(itemId);
    res.json({ message: "Елемент видалено" });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};
