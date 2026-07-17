import { Document, Model } from "mongoose";
import { escapeRegex } from "../utils/regex";

export const createReferenceService = <TDoc extends Document>(
  model: Model<TDoc>,
) => ({
  getAll: async (): Promise<TDoc[]> => model.find(),

  searchByName: async (query: string): Promise<TDoc[]> =>
    model.find({ name: { $regex: escapeRegex(query), $options: "i" } }).limit(20),

  create: async (data: Record<string, unknown>): Promise<TDoc> =>
    model.create(data),

  update: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<TDoc | null> => model.findByIdAndUpdate(id, { $set: data }, { new: true }),

  remove: async (id: string): Promise<TDoc | null> =>
    model.findByIdAndDelete(id),
});
