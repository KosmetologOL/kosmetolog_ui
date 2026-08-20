import * as specialistService from "../services/specialist.service";
import { createReferenceController } from "./createReferenceController";

const controller = createReferenceController(specialistService, ["name"]);

export const getAll = controller.getAll;
export const searchSpecialists = controller.search;
export const createSpecialist = controller.create;
export const updateSpecialist = controller.update;
export const deleteSpecialist = controller.remove;
