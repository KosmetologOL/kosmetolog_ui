import type { AuthUser } from "#api/authApi";
import { createContext } from "react";

export interface AuthContextProps {
  token: string | null;
  user: AuthUser | null;
  authReady: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  canAccessReferencePanel: boolean;
  login: (token: string, user: AuthUser | null) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextProps | undefined>(
  undefined,
);
