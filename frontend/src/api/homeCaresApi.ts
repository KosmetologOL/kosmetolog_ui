import axios from "axios";
import { createReferenceApi } from "./createReferenceApi";

export interface IHomeCare {
  _id?: string;
  name: string;
  morning: boolean;
  evening: boolean;
  order?: number;
  medicationName?: string;
  recommendations?: string;
}

const homeCaresApi = createReferenceApi<IHomeCare, Partial<IHomeCare>>(
  "home-cares",
  { searchParamName: "search" },
);

export const getAllHomeCares = homeCaresApi.getAll;
export const searchHomeCaresByName = homeCaresApi.searchByName;
export const createHomeCare = homeCaresApi.create;
export const updateHomeCare = homeCaresApi.update;
export const deleteHomeCare = homeCaresApi.remove;

export const reorderHomeCares = async (ids: string[]): Promise<IHomeCare[]> => {
  const { data } = await axios.put<IHomeCare[]>(`${homeCaresApi.apiUrl}/reorder`, {
    ids,
  });
  return data;
};
