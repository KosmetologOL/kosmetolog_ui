import { createReferenceApi } from "./createReferenceApi";

export interface IExam {
  _id?: string;
  name: string;
  query?: string;
  recommendation: string;
}

const examsApi = createReferenceApi<IExam>("exams");

export const getAllExams = examsApi.getAll;
export const searchExamsByName = examsApi.searchByName;
export const createExam = examsApi.create;
export const updateExam = examsApi.update;
export const deleteExam = examsApi.remove;
