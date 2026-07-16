import { createReferenceApi } from "./createReferenceApi";

export interface IProcedure {
  _id?: string;
  name: string;
  query?: string;
  recommendation: string;
}

const proceduresApi = createReferenceApi<IProcedure>("procedures");

export const getAllProcedures = proceduresApi.getAll;
export const searchProceduresByName = proceduresApi.searchByName;
export const createProcedure = proceduresApi.create;
export const updateProcedure = proceduresApi.update;
export const deleteProcedure = proceduresApi.remove;
