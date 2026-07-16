import Medication, { IMedication } from "../models/MedicationSchema";
import { createReferenceService } from "./createReferenceService";

const service = createReferenceService<IMedication>(Medication);

export const getAll = service.getAll;
export const searchByName = service.searchByName;

export const create = (data: {
  name: string;
  recommendation: string;
}): Promise<IMedication> => service.create(data);

export const update = (
  id: string,
  data: { name: string },
): Promise<IMedication | null> => service.update(id, data);

export const remove = service.remove;
