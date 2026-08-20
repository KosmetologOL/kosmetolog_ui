import {
  getCurrentUser,
  logoutUser,
  refreshToken,
  type AuthUser,
} from "#api/authApi";
import { AuthContext } from "#context/AuthContext";
import { registerAuthHandlers } from "#lib/sessionRefresh";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const login = useCallback((newToken: string, nextUser: AuthUser | null) => {
    setToken(newToken);
    setUser(nextUser);
    axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;
  }, []);

  const clearLocalSession = useCallback(() => {
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common.Authorization;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Logout error:", err);
    }

    clearLocalSession();
  }, [clearLocalSession]);

  useEffect(() => {
    registerAuthHandlers({
      updateToken: (newToken: string) => {
        setToken(newToken);
        axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      },
      onSessionExpired: () => {
        void logout();
      },
    });
  }, [logout]);

  useEffect(() => {
    const initializeAuth = async () => {
      // Одноразово прибираємо значення, збережені попередніми версіями
      // застосунку: токен і user більше не потрапляють у localStorage.
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const tryRefresh = async () => {
        try {
          const { accessToken } = await refreshToken();
          axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          const { user } = await getCurrentUser();
          login(accessToken, user);
        } catch {
          // No valid session to refresh — nothing to invalidate server-side,
          // so just clear local state instead of calling /auth/logout.
          clearLocalSession();
        }
      };

      await tryRefresh();

      setAuthReady(true);
    };

    void initializeAuth();
  }, [login, clearLocalSession]);

  const role = user?.role?.toLowerCase() ?? "user";

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        authReady,
        isAdmin: role === "admin",
        isDoctor: role === "doctor",
        canAccessReferencePanel: role === "admin" || role === "doctor",
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
