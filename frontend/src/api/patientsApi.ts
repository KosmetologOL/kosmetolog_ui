import axios from "axios";

export interface IPatient {
  _id?: string;
  fullName: string;
  createdAt?: string;
}

interface ApiResponse {
  patients: IPatient[];
  totalPages: number;
}

const API_URL = import.meta.env.VITE_API_URL + "/patients";

export const getAllPatients = async (
  page: number,
  limit: number,
  query: string
) => {
  const { data } = await axios.get<ApiResponse>(
    `${API_URL}?page=${page}&limit=${limit}&query=${query}`
  );
  return data;
};

export const getPatientById = async (id: string) =>
  (await axios.get<IPatient>(`${API_URL}/${id}`)).data;

export const createPatient = async (patient: IPatient) =>
  (await axios.post<IPatient>(API_URL, patient)).data;

export const updatePatient = async (id: string, patient: IPatient) =>
  (await axios.put<IPatient>(`${API_URL}/${id}`, patient)).data;

export const deletePatient = async (id: string) => {
  await axios.delete(`${API_URL}/${id}`);
};
