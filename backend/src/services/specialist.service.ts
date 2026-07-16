import Specialist, { ISpecialist } from "../models/SpecialistSchema";
import { createReferenceService } from "./createReferenceService";

const service = createReferenceService<ISpecialist>(Specialist);

export const getAll = service.getAll;
export const searchByName = service.searchByName;

export const create = (data: { name: string }): Promise<ISpecialist> =>
  service.create(data);

export const update = (
  id: string,
  data: { name: string },
): Promise<ISpecialist | null> => service.update(id, data);

export const remove = service.remove;
