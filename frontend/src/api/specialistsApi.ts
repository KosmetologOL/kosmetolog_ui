import { createReferenceApi } from "./createReferenceApi";

export interface ISpecialist {
  _id?: string;
  name: string;
  query?: string;
}

const specialistsApi = createReferenceApi<ISpecialist>("specialists");

export const getAllSpecialists = specialistsApi.getAll;
export const searchSpecialistsByName = specialistsApi.searchByName;
export const createSpecialist = specialistsApi.create;
export const updateSpecialist = specialistsApi.update;
export const deleteSpecialist = specialistsApi.remove;
