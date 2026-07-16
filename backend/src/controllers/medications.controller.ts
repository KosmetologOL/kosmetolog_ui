import * as MedicationsService from "../services/medications.service";
import { createReferenceController } from "./createReferenceController";

const controller = createReferenceController(MedicationsService, [
  "name",
  "recommendation",
]);

export const getAllMedications = controller.getAll;
export const searchMedications = controller.search;
export const createMedication = controller.create;
export const updateMedication = controller.update;
export const deleteMedication = controller.remove;
