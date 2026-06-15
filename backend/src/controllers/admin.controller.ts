import { Request, Response } from "express";
import * as AdminService from "../services/admin.service";

export const getDoctors = async (_req: Request, res: Response) => {
  try {
    const docs = await AdminService.listDoctors();
    res.json({ doctors: docs });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const setUserActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    const user = await AdminService.toggleUserActive(id, !!active);
    res.json({ user });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const listRegistrationRequests = async (
  _req: Request,
  res: Response,
) => {
  try {
    const reqs = await AdminService.getRegistrationRequests();
    res.json({ requests: reqs });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const approveRegistrationRequest = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const approverId = (req as any).user?.id;
    const user = await AdminService.approveRegistration(id, approverId);
    // In production send email notification here
    res.json({ user, message: "Approved" });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

// Categories
export const getCategories = async (_req: Request, res: Response) => {
  try {
    const cats = await AdminService.listCategories();
    res.json({ categories: cats });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const cat = await AdminService.createCategory(name);
    res.status(201).json({ category: cat });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const cat = await AdminService.updateCategory(id, name);
    res.json({ category: cat });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await AdminService.deleteCategory(id);
    res.json({ message: "Категорія видалена" });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

// Hospitals
export const getHospitals = async (_req: Request, res: Response) => {
  try {
    const hs = await AdminService.listHospitals();
    res.json({ hospitals: hs });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const createHospital = async (req: Request, res: Response) => {
  try {
    const { name, address, phone } = req.body;
    const h = await AdminService.createHospital({ name, address, phone });
    res.status(201).json({ hospital: h });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const updateHospital = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const h = await AdminService.updateHospital(id, req.body);
    res.json({ hospital: h });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const deleteHospital = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await AdminService.deleteHospital(id);
    res.json({ message: "Лікарню видалено" });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

// Category Items
export const listCategoryItems = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const items = await AdminService.listCategoryItems(categoryId);
    res.json({ items });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const createCategoryItem = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { name, recommendation } = req.body;
    const item = await AdminService.createCategoryItem(
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
    const item = await AdminService.updateCategoryItem(
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
    await AdminService.deleteCategoryItem(itemId);
    res.json({ message: "Елемент видалено" });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};
