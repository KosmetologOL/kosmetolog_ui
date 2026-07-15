import Medication, { IMedication } from "../models/MedicationSchema";
import { escapeRegex } from "../utils/regex";

export const getAll = async (): Promise<IMedication[]> => {
  return Medication.find();
};
export const searchByName = async (query: string): Promise<IMedication[]> => {
  return Medication.find({
    name: { $regex: escapeRegex(query), $options: "i" },
  }).limit(20);
};
export const create = async (data: {
  name: string;
  recommendation: string;
}): Promise<IMedication> => {
  const medication = new Medication(data);
  return medication.save();
};
export const update = async (
  id: string,
  data: { name: string }
): Promise<IMedication | null> => {
  return Medication.findByIdAndUpdate(id, { $set: data }, { new: true });
};
export const remove = async (id: string): Promise<IMedication | null> => {
  return Medication.findByIdAndDelete(id);
};
