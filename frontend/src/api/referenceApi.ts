import { API_URL as BASE_URL } from "#lib/config";
import axios from "axios";

// Форма відповіді бекенда: User без пароля (див. backend/src/services/doctors.service.ts)
export interface IDoctor {
  _id: string;
  email: string;
  name?: string;
  role?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Форма відповіді бекенда: RegistrationRequest без passwordHash
// (див. backend/src/controllers/registrationRequests.controller.ts)
export interface IRegistrationRequest {
  _id: string;
  email: string;
  name?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const getDoctors = async (): Promise<IDoctor[]> => {
  const { data } = await axios.get<{ doctors: IDoctor[] }>(
    `${BASE_URL}/doctors`,
  );
  return data.doctors;
};

export const setUserActive = async (
  id: string,
  active: boolean,
): Promise<IDoctor> => {
  const { data } = await axios.patch<{ user: IDoctor }>(
    `${BASE_URL}/doctors/${id}/active`,
    { active },
  );
  return data.user;
};

export const deleteDoctor = async (id: string) => {
  await axios.delete(`${BASE_URL}/doctors/${id}`);
};

export const getRegistrationRequests = async (): Promise<
  IRegistrationRequest[]
> => {
  const { data } = await axios.get<{ requests: IRegistrationRequest[] }>(
    `${BASE_URL}/registration-requests`,
  );
  return data.requests;
};

export const approveRegistration = async (
  id: string,
): Promise<{ user: IDoctor | null; message: string }> => {
  const { data } = await axios.post<{ user: IDoctor | null; message: string }>(
    `${BASE_URL}/registration-requests/${id}/approve`,
  );
  return data;
};

export const rejectRegistration = async (id: string): Promise<void> => {
  await axios.delete(`${BASE_URL}/registration-requests/${id}`);
};

export const CATEGORY_REPORT_POSITIONS = [
  "after_specialists",
  "after_exams",
  "after_medications",
  "after_homecare",
  "after_procedure_stages",
  "after_procedures",
] as const;

export type CategoryReportPosition = (typeof CATEGORY_REPORT_POSITIONS)[number];

export interface ICategory {
  _id: string;
  name: string;
  showNameInReport?: boolean;
  reportPosition?: CategoryReportPosition;
  importantNote?: string;
}

export interface ICategoryItem {
  _id: string;
  category: string;
  name: string;
  recommendation?: string;
}

export const getCategories = async (): Promise<ICategory[]> => {
  const { data } = await axios.get(`${BASE_URL}/categories`);
  return data.categories;
};

export const createCategory = async (
  name: string,
  showNameInReport?: boolean,
  reportPosition?: CategoryReportPosition,
  importantNote?: string,
) => {
  const { data } = await axios.post(`${BASE_URL}/categories`, {
    name,
    showNameInReport,
    reportPosition,
    importantNote,
  });
  return data.category;
};

export const updateCategory = async (
  id: string,
  name: string,
  showNameInReport?: boolean,
  reportPosition?: CategoryReportPosition,
  importantNote?: string,
) => {
  const { data } = await axios.patch(`${BASE_URL}/categories/${id}`, {
    name,
    showNameInReport,
    reportPosition,
    importantNote,
  });
  return data.category;
};

export const deleteCategory = async (id: string) => {
  const { data } = await axios.delete(`${BASE_URL}/categories/${id}`);
  return data;
};

export const listCategoryItems = async (
  categoryId: string,
): Promise<ICategoryItem[]> => {
  const { data } = await axios.get(`${BASE_URL}/categories/${categoryId}/items`);
  return data.items;
};

export const createCategoryItem = async (
  categoryId: string,
  name: string,
  recommendation?: string,
) => {
  const { data } = await axios.post(
    `${BASE_URL}/categories/${categoryId}/items`,
    { name, recommendation },
  );
  return data.item;
};

export const updateCategoryItem = async (
  itemId: string,
  name: string,
  recommendation?: string,
) => {
  const { data } = await axios.patch(`${BASE_URL}/categories/items/${itemId}`, {
    name,
    recommendation,
  });
  return data.item;
};

export const deleteCategoryItem = async (itemId: string) => {
  const { data } = await axios.delete(
    `${BASE_URL}/categories/items/${itemId}`,
  );
  return data;
};
