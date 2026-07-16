import { createReferenceApi } from "./createReferenceApi";

export interface IMedication {
  _id?: string;
  name: string;
  query?: string;
  recommendation: string;
}

const medicationsApi = createReferenceApi<IMedication>("medications");

export const getAllMedications = medicationsApi.getAll;
export const searchMedicationsByName = medicationsApi.searchByName;
export const createMedication = medicationsApi.create;
export const updateMedication = medicationsApi.update;
export const deleteMedication = medicationsApi.remove;
