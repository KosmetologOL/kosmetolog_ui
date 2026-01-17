import { Request, Response } from "express";
import * as AuthService from "../services/auth.service";

export const registerUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email і пароль обов'язкові" });

  try {
    const user = await AuthService.register(email, password);
    res.status(201).json({ email: user.email, role: user.role, id: user._id });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email і пароль обов'язкові" });

  try {
    const { accessToken, refreshToken, user } = await AuthService.login(
      email,
      password,
      rememberMe,
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken, user });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "Немає refresh-токена" });

  try {
    const { accessToken } = await AuthService.refresh(token);
    res.json({ accessToken });
  } catch (err) {
    res.status(403).json({ message: (err as Error).message });
  }
};

export const logoutUser = async (_req: Request, res: Response) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
  res.json({ message: "Вихід виконано" });
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Неавторизовано" });
    const user = await AuthService.getCurrentUser(userId);
    res.json({ user });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};
