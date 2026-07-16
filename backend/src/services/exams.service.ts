import Exam, { IExam } from "../models/ExamSchema";
import { createReferenceService } from "./createReferenceService";

const service = createReferenceService<IExam>(Exam);

export const getAll = service.getAll;
export const searchByName = service.searchByName;

export const create = (data: {
  name: string;
  recommendation: string;
}): Promise<IExam> => service.create(data);

export const update = (id: string, data: { name: string }): Promise<IExam | null> =>
  service.update(id, data);

export const remove = service.remove;
