import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../config/env";
import User, { IUser } from "../models/UserSchema";
import * as RegistrationRequestsService from "./registrationRequests.service";

const generateTokens = (user: { id: string; email: string; role: string }) => {
  const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
};

const MAX_FAILED_LOGIN_ATTEMPTS = 10;
const LOCK_DURATION_MS = 15 * 60 * 1000;

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

  if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
    throw new Error(
      "Забагато невдалих спроб входу. Спробуйте пізніше.",
    );
  }

  const match = await user.comparePassword(password);
  if (!match) {
    user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      user.failedLoginAttempts = 0;
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await user.save();
    throw new Error("Неправильний email або пароль");
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

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
