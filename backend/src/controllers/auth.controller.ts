import { NextFunction, Request, Response } from "express";
import * as AuthService from "../services/auth.service";
import ApiError from "../utils/ApiError";

// Куку читають лише /auth/refresh і /auth/logout, тож звужуємо path до /auth.
// secure + sameSite "none" обовʼязкові: фронт і бек живуть на різних origin.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  path: "/auth",
};

export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email, password, name, role } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email і пароль обов'язкові" });

  try {
    const result = await AuthService.register(email, password, name, role);
    if ((result as any)._id && (result as any).passwordHash) {
      return res.status(201).json({ message: "Запит на реєстрацію створено" });
    }

    const user = result as any;
    res.status(201).json({ email: user.email, role: user.role, id: user._id });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email і пароль обов'язкові" });

  try {
    const { accessToken, refreshToken, refreshTtlMs, user } =
      await AuthService.login(email, password, rememberMe);
    res.cookie("refreshToken", refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: refreshTtlMs,
    });

    res.json({ accessToken, user });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "Немає refresh-токена" });

  try {
    const { accessToken, refreshToken: rotated, refreshTtlMs } =
      await AuthService.refresh(token);
    res.cookie("refreshToken", rotated, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: refreshTtlMs,
    });
    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  if (token) {
    try {
      await AuthService.revokeRefreshToken(token);
    } catch (err) {
      console.error(err);
    }
  }

  res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
  // Куки, видані до цього релізу, мають path "/" — без другого clearCookie
  // вони залишилися б у браузері назавжди.
  res.clearCookie("refreshToken", { ...REFRESH_COOKIE_OPTIONS, path: "/" });
  res.json({ message: "Вихід виконано" });
};

export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return next(ApiError.unauthorized("Неавторизовано"));
    const user = await AuthService.getCurrentUser(userId);
    res.json({ user });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};
