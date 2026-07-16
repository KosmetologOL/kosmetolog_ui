import * as specialistService from "../services/specialist.service";
import { createReferenceController } from "./createReferenceController";

const controller = createReferenceController(specialistService, ["name"]);

export const getAll = controller.getAll;
export const searchSpecialists = controller.search;
export const createdSpecialist = controller.create;
export const updatedSpecialist = controller.update;
export const deletedSpecialist = controller.remove;
