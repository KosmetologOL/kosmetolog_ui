import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL + "/home-cares";

export interface IHomeCare {
  _id?: string;
  name: string;
  morning: boolean;
  evening: boolean;
  order?: number;
  medicationName?: string;
  recommendations?: string;
}
export const getAllHomeCares = async (): Promise<IHomeCare[]> => {
  const { data } = await axios.get(API_URL);
  return data;
};

export const searchHomeCaresByName = async (
  name?: string,
): Promise<IHomeCare[]> => {
  const params: Record<string, string> = {};
  if (name) params.search = name;
  const { data } = await axios.get<IHomeCare[]>(API_URL, { params });
  return data;
};

export const createHomeCare = async (
  homeCare: Partial<IHomeCare>,
): Promise<IHomeCare> => {
  const { data } = await axios.post<IHomeCare>(API_URL, homeCare);
  return data;
};

export const updateHomeCare = async (
  id: string,
  homeCare: Partial<IHomeCare>,
): Promise<IHomeCare> => {
  const { data } = await axios.put<IHomeCare>(`${API_URL}/${id}`, homeCare);
  return data;
};

export const deleteHomeCare = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/${id}`);
};

export const reorderHomeCares = async (ids: string[]): Promise<IHomeCare[]> => {
  const { data } = await axios.put<IHomeCare[]>(`${API_URL}/reorder`, { ids });
  return data;
};
