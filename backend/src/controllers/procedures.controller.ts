import * as ProceduresService from "../services/procedures.service";
import { createReferenceController } from "./createReferenceController";

const controller = createReferenceController(ProceduresService, [
  "name",
  "recommendation",
]);

export const getAllProcedures = controller.getAll;
export const searchProcedures = controller.search;
export const createProcedure = controller.create;
export const updateProcedure = controller.update;
export const deleteProcedure = controller.remove;
