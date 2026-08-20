import { API_URL as BASE_URL } from "#lib/config";
import axios from "axios";

const API_URL = BASE_URL + "/auth";

axios.defaults.withCredentials = true;

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
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

/**
 * Відповідь /auth/register: для лікаря бекенд створює запит на реєстрацію
 * і повертає лише { message }; для звичайного користувача — дані акаунта.
 */
export interface RegisterResponse {
  message?: string;
  email?: string;
  role?: string;
  id?: string;
}

export const registerUser = async (
  email: string,
  password: string,
  name?: string,
  role?: string,
) => {
  const { data } = await axios.post<RegisterResponse>(`${API_URL}/register`, {
    email,
    password,
    name,
    role,
  });
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
