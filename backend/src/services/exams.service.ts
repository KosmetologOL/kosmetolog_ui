import Exam, { IExam } from "../models/ExamSchema";
import { escapeRegex } from "../utils/regex";

export const getAll = async (): Promise<IExam[]> => {
  return Exam.find();
};
export const searchByName = async (query: string): Promise<IExam[]> => {
  return Exam.find({
    name: { $regex: escapeRegex(query), $options: "i" },
  }).limit(20);
};
export const create = async (data: {
  name: string;
  recommendation: string;
}): Promise<IExam> => {
  const exam = new Exam(data);
  return exam.save();
};
export const update = async (
  id: string,
  data: { name: string }
): Promise<IExam | null> => {
  return Exam.findByIdAndUpdate(id, { $set: data }, { new: true });
};
export const remove = async (id: string): Promise<IExam | null> => {
  return Exam.findByIdAndDelete(id);
};
