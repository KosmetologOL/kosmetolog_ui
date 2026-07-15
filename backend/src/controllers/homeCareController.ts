import { Request, Response } from "express";
import {
  createHomeCareService,
  deleteHomeCareService,
  getAllHomeCaresService,
  reorderHomeCaresService,
  updateHomeCareService,
} from "../services/homeCare.service";

export const getAllHomeCares = async (req: Request, res: Response) => {
  try {
    const search = req.query.search?.toString();
    const homeCares = await getAllHomeCaresService(search);
    res.json(homeCares);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const createHomeCare = async (req: Request, res: Response) => {
  try {
    const homeCare = await createHomeCareService(req.body);
    res.status(201).json(homeCare);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const updateHomeCare = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedHomeCare = await updateHomeCareService(id, req.body);
    if (!updatedHomeCare) {
      return res.status(404).json({ message: "Домашній догляд не знайдено" });
    }
    res.json(updatedHomeCare);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const deleteHomeCare = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedHomeCare = await deleteHomeCareService(id);
    if (!deletedHomeCare) {
      return res.status(404).json({ message: "Домашній догляд не знайдено" });
    }
    res.json(deletedHomeCare);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const reorderHomeCares = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };
    const reorderedHomeCares = await reorderHomeCaresService(ids);
    res.json(reorderedHomeCares);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};
