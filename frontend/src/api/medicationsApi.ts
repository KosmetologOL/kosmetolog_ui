import axios from "axios";

export interface IMedication {
  _id?: string;
  name: string;
  query?: string;
  recommendation: string;
}

const API_URL = import.meta.env.VITE_API_URL + "/medications";

export const setAuthToken = (token: string | null) => {
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
};

export const getAllMedications = async () =>
  (await axios.get<IMedication[]>(API_URL)).data;
export const searchMedicationsByName = async (query: string) =>
  (await axios.get<IMedication[]>(`${API_URL}/search`, { params: { query } }))
    .data;
export const createMedication = async (medication: IMedication) =>
  (await axios.post(API_URL, medication)).data;
export const updateMedication = async (id: string, medication: IMedication) =>
  (await axios.put(`${API_URL}/${id}`, medication)).data;
export const deleteMedication = async (id: string) =>
  (await axios.delete(`${API_URL}/${id}`)).data;
