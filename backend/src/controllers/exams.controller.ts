import * as ExamsService from "../services/exams.service";
import { createReferenceController } from "./createReferenceController";

const controller = createReferenceController(ExamsService, [
  "name",
  "recommendation",
]);

export const getAllExams = controller.getAll;
export const searchExams = controller.search;
export const createExam = controller.create;
export const updateExam = controller.update;
export const deleteExam = controller.remove;
