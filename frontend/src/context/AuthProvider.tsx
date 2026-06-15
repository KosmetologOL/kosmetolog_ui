import {
  getCurrentUser,
  logoutUser,
  refreshToken,
  type AuthUser,
} from "#api/authApi";
import { AuthContext } from "#context/AuthContext";
import axios from "axios";
import React, { useEffect, useState } from "react";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const login = (newToken: string, nextUser: AuthUser | null) => {
    setToken(newToken);
    setUser(nextUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Logout error:", err);
    }

    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common.Authorization;
  };

  // expose simple hook for UI places that don't use context directly (admin panel logout button)
  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__logout = logout;
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__logout;
    };
  }, [logout]);

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (savedToken) {
        setToken(savedToken);
        axios.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
      }

      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser) as AuthUser);
        } catch {
          localStorage.removeItem("user");
        }
      }

      const tryRefresh = async () => {
        try {
          const { accessToken } = await refreshToken();
          axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          const { user } = await getCurrentUser();
          login(accessToken, user);
        } catch {
          await logout();
        }
      };

      if (!savedToken) {
        await tryRefresh();
      } else {
        try {
          const { user } = await getCurrentUser();
          login(savedToken, user);
        } catch {
          await tryRefresh();
        }
      }

      setAuthReady(true);
    };

    void initializeAuth();
  }, []);

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
