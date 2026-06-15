import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL + "/admin";

export const getDoctors = async () => {
  const { data } = await axios.get(`${API_URL}/doctors`);
  return data.doctors;
};

export const setUserActive = async (id: string, active: boolean) => {
  const { data } = await axios.patch(`${API_URL}/users/${id}/active`, {
    active,
  });
  return data.user;
};

export const getRegistrationRequests = async () => {
  const { data } = await axios.get(`${API_URL}/registration-requests`);
  return data.requests;
};

export const approveRegistration = async (id: string) => {
  const { data } = await axios.post(
    `${API_URL}/registration-requests/${id}/approve`,
  );
  return data;
};

export const getCategories = async () => {
  const { data } = await axios.get(`${API_URL}/categories`);
  return data.categories;
};

export const createCategory = async (name: string) => {
  const { data } = await axios.post(`${API_URL}/categories`, { name });
  return data.category;
};

export const updateCategory = async (id: string, name: string) => {
  const { data } = await axios.patch(`${API_URL}/categories/${id}`, { name });
  return data.category;
};

export const deleteCategory = async (id: string) => {
  const { data } = await axios.delete(`${API_URL}/categories/${id}`);
  return data;
};

export const getHospitals = async () => {
  const { data } = await axios.get(`${API_URL}/hospitals`);
  return data.hospitals;
};

export const createHospital = async (payload: {
  name: string;
  address?: string;
  phone?: string;
}) => {
  const { data } = await axios.post(`${API_URL}/hospitals`, payload);
  return data.hospital;
};

export const updateHospital = async (id: string, payload: any) => {
  const { data } = await axios.patch(`${API_URL}/hospitals/${id}`, payload);
  return data.hospital;
};

export const deleteHospital = async (id: string) => {
  const { data } = await axios.delete(`${API_URL}/hospitals/${id}`);
  return data;
};

export const listCategoryItems = async (categoryId: string) => {
  const { data } = await axios.get(`${API_URL}/categories/${categoryId}/items`);
  return data.items;
};

export const createCategoryItem = async (
  categoryId: string,
  name: string,
  recommendation?: string,
) => {
  const { data } = await axios.post(
    `${API_URL}/categories/${categoryId}/items`,
    { name, recommendation },
  );
  return data.item;
};

export const updateCategoryItem = async (
  itemId: string,
  name: string,
  recommendation?: string,
) => {
  const { data } = await axios.patch(`${API_URL}/items/${itemId}`, {
    name,
    recommendation,
  });
  return data.item;
};

export const deleteCategoryItem = async (itemId: string) => {
  const { data } = await axios.delete(`${API_URL}/items/${itemId}`);
  return data;
};
