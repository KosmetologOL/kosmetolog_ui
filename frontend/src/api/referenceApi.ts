import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;

export const getDoctors = async () => {
  const { data } = await axios.get(`${BASE_URL}/doctors`);
  return data.doctors;
};

export const setUserActive = async (id: string, active: boolean) => {
  const { data } = await axios.patch(`${BASE_URL}/doctors/${id}/active`, {
    active,
  });
  return data.user;
};

export const deleteDoctor = async (id: string) => {
  await axios.delete(`${BASE_URL}/doctors/${id}`);
};

export const getRegistrationRequests = async () => {
  const { data } = await axios.get(`${BASE_URL}/registration-requests`);
  return data.requests;
};

export const approveRegistration = async (id: string) => {
  const { data } = await axios.post(
    `${BASE_URL}/registration-requests/${id}/approve`,
  );
  return data;
};

export const getCategories = async () => {
  const { data } = await axios.get(`${BASE_URL}/categories`);
  return data.categories;
};

export const createCategory = async (name: string) => {
  const { data } = await axios.post(`${BASE_URL}/categories`, { name });
  return data.category;
};

export const updateCategory = async (id: string, name: string) => {
  const { data } = await axios.patch(`${BASE_URL}/categories/${id}`, { name });
  return data.category;
};

export const deleteCategory = async (id: string) => {
  const { data } = await axios.delete(`${BASE_URL}/categories/${id}`);
  return data;
};

export const listCategoryItems = async (categoryId: string) => {
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
