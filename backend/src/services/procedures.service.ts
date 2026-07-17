import Procedure, { IProcedure } from "../models/ProcedureSchema";
import { createReferenceService } from "./createReferenceService";

const service = createReferenceService<IProcedure>(Procedure);

export const getAll = service.getAll;
export const searchByName = service.searchByName;

export const create = (data: {
  name: string;
  recommendation: string;
}): Promise<IProcedure> => service.create(data);

export const update = (
  id: string,
  data: { name: string },
): Promise<IProcedure | null> => service.update(id, data);

export const remove = service.remove;
