import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env";

export type UserRole = "admin" | "doctor" | "user";

export interface RequestUser {
  id: string;
  email?: string;
  role?: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Немає токена" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as RequestUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Токен недійсний або прострочений" });
  }
};

export const requireRoles =
  (...roles: UserRole[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Неавторизовано" });
    }

    const role = (req.user.role ?? "user")
      .toString()
      .trim()
      .toLowerCase() as UserRole;

    if (
      !roles
        .map((required) => required.toString().trim().toLowerCase() as UserRole)
        .includes(role)
    ) {
      return res.status(403).json({ message: "Недостатньо прав доступу" });
    }

    next();
  };
