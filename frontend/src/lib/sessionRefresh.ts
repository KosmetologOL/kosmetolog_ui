import { refreshToken as refreshTokenRequest } from "#api/authApi";
import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface AuthHandlers {
  updateToken: (token: string) => void;
  onSessionExpired: () => void;
}

let handlers: AuthHandlers | null = null;
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

export const registerAuthHandlers = (next: AuthHandlers) => {
  handlers = next;
};

const onRefreshed = (token: string | null) => {
  pendingQueue.forEach((callback) => callback(token));
  pendingQueue = [];
};

export const setupSessionRefresh = () => {
  axios.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetryableRequestConfig | undefined;

      if (
        error.response?.status !== 401 ||
        !config ||
        config._retry ||
        config.url?.includes("/auth/refresh")
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((token) => {
            if (!token) {
              reject(error);
              return;
            }
            config._retry = true;
            config.headers.set("Authorization", `Bearer ${token}`);
            resolve(axios(config));
          });
        });
      }

      config._retry = true;
      isRefreshing = true;

      try {
        const { accessToken } = await refreshTokenRequest();
        handlers?.updateToken(accessToken);
        onRefreshed(accessToken);
        config.headers.set("Authorization", `Bearer ${accessToken}`);
        return axios(config);
      } catch (refreshError) {
        console.error("Session refresh failed:", refreshError);
        onRefreshed(null);
        handlers?.onSessionExpired();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    },
  );
};
