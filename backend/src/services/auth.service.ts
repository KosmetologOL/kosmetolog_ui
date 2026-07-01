import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User, { IUser } from "../models/UserSchema";
import * as RegistrationRequestsService from "./registrationRequests.service";

const JWT_SECRET = process.env.JWT_SECRET || "secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret";

const generateTokens = (user: { id: string; email: string; role: string }) => {
  const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
};

const toSafeUser = (user: IUser) => ({
  id: (user._id as mongoose.Types.ObjectId).toString(),
  email: user.email,
  name: user.name || "",
  role: (user.role ?? "user").toString().trim().toLowerCase(),
});

export const register = async (
  email: string,
  password: string,
  name?: string,
  role = "user",
) => {
  const existing = await User.findOne({ email });
  if (existing) throw new Error("Користувач вже існує");

  if ((role ?? "").toString().toLowerCase() === "doctor") {
    const req = await RegistrationRequestsService.createRegistrationRequest(
      email,
      password,
      role,
      name,
    );
    return req;
  }

  const user = new User({ email, password, role, name });
  await user.save();
  return user;
};

import RegistrationRequest from "../models/RegistrationRequest";

export const login = async (
  email: string,
  password: string,
  rememberMe: boolean,
) => {
  const user = await User.findOne({ email });
  if (!user) {
    const pending = await RegistrationRequest.findOne({ email });
    if (pending) throw new Error("Запит на реєстрацію очікує підтвердження");
    throw new Error("Неправильний email або пароль");
  }

  if (user.active === false) throw new Error("Акаунт деактивовано");

  const match = await user.comparePassword(password);
  if (!match) throw new Error("Неправильний email або пароль");

  const safeUser = toSafeUser(user);
  const { accessToken, refreshToken } = generateTokens(safeUser);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
  };

  return {
    accessToken,
    refreshToken,
    cookieOptions,
    user: safeUser,
  };
};

export const refresh = async (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
    const user = await User.findById(decoded.id);
    if (!user) throw new Error("Користувача не знайдено");

    const safeUser = toSafeUser(user);
    const { accessToken } = generateTokens(safeUser);
    return { accessToken };
  } catch (err) {
    throw new Error("Недійсний або прострочений refresh-токен");
  }
};

export const getCurrentUser = async (userId: string) => {
  const user = await User.findById(userId).select("-password");
  if (!user) throw new Error("Користувача не знайдено");
  return user;
};
