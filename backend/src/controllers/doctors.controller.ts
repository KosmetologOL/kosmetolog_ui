import { Request, Response } from "express";
import * as DoctorsService from "../services/doctors.service";

export const getDoctors = async (_req: Request, res: Response) => {
  try {
    const doctors = await DoctorsService.listDoctors();
    res.json({ doctors });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const setDoctorActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    const user = await DoctorsService.toggleUserActive(id, Boolean(active));
    res.json({ user });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};
