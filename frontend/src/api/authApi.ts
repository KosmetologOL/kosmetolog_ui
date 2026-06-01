import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL + "/auth";

axios.defaults.withCredentials = true;

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export const loginUser = async (
  email: string,
  password: string,
  rememberMe?: boolean,
) => {
  const { data } = await axios.post(
    `${API_URL}/login`,
    { email, password, rememberMe },
    {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    },
  );
  return data;
};

export const registerUser = async (email: string, password: string) => {
  const { data } = await axios.post(`${API_URL}/register`, { email, password });
  return data;
};

export const refreshToken = async () => {
  const { data } = await axios.get(`${API_URL}/refresh`);
  return data;
};

export const logoutUser = async () => {
  await axios.post(`${API_URL}/logout`);
};

export const getCurrentUser = async () => {
  const { data } = await axios.get<{ user: AuthUser }>(`${API_URL}/me`);
  return data;
};
