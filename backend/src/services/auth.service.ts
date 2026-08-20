import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import crypto from "node:crypto";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../config/env";
import RefreshSession from "../models/RefreshSessionSchema";
import User, { IUser } from "../models/UserSchema";
import ApiError from "../utils/ApiError";
import * as RegistrationRequestsService from "./registrationRequests.service";

// sha256, а не bcrypt: сесію треба знаходити за хешем токена одним запитом.
const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const DAY_MS = 24 * 60 * 60 * 1000;
// Скільки стара сесія ще живе після ротації: паралельний refresh із другої
// вкладки не повинен розлогінювати користувача.
const ROTATION_GRACE_MS = 60_000;

const generateTokens = (
  user: { id: string; email: string; role: string },
  rememberMe: boolean,
) => {
  const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: "15m" });
  // jti робить кожен refresh-токен унікальним: без нього два запити в межах
  // однієї секунди дали б байт-у-байт однаковий JWT і колізію tokenHash.
  const refreshToken = jwt.sign(
    { id: user.id, jti: crypto.randomUUID() },
    JWT_REFRESH_SECRET,
    { expiresIn: rememberMe ? "30d" : "7d" },
  );
  const refreshTtlMs = (rememberMe ? 30 : 7) * DAY_MS;
  return { accessToken, refreshToken, refreshTtlMs };
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
  if (existing) throw ApiError.badRequest("Користувач вже існує");

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
    if (pending)
      throw ApiError.badRequest("Запит на реєстрацію очікує підтвердження");
    throw ApiError.badRequest("Неправильний email або пароль");
  }

  if (user.active === false) throw ApiError.badRequest("Акаунт деактивовано");

  if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
    throw ApiError.badRequest(
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
    throw ApiError.badRequest("Неправильний email або пароль");
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  const safeUser = toSafeUser(user);
  const { accessToken, refreshToken, refreshTtlMs } = generateTokens(
    safeUser,
    Boolean(rememberMe),
  );

  await RefreshSession.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    rememberMe: Boolean(rememberMe),
    expiresAt: new Date(Date.now() + refreshTtlMs),
  });

  return {
    accessToken,
    refreshToken,
    refreshTtlMs,
    user: safeUser,
  };
};

export const refresh = async (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
    const user = await User.findById(decoded.id);
    if (!user) throw new Error("Користувача не знайдено");

    if (user.active === false) throw new Error("Акаунт деактивовано");

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      throw new Error(
        "Забагато невдалих спроб входу. Спробуйте пізніше.",
      );
    }

    const session = await RefreshSession.findOne({
      tokenHash: hashToken(token),
    });
    // Сесії немає — токен відкликано (logout, деактивація) або вже витіснено
    // ротацією. expiresAt звіряємо явно: TTL-монітор Mongo прибирає документи
    // із запізненням до ~60 с.
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new Error("Сесію відкликано або прострочено");
    }

    const safeUser = toSafeUser(user);
    const { accessToken, refreshToken, refreshTtlMs } = generateTokens(
      safeUser,
      session.rememberMe,
    );

    await RefreshSession.create({
      userId: user._id,
      tokenHash: hashToken(refreshToken),
      rememberMe: session.rememberMe,
      expiresAt: new Date(Date.now() + refreshTtlMs),
    });

    // Стару сесію не видаляємо одразу — лишаємо grace-період.
    await RefreshSession.updateOne(
      { _id: session._id },
      { $set: { expiresAt: new Date(Date.now() + ROTATION_GRACE_MS) } },
    );

    return { accessToken, refreshToken, refreshTtlMs };
  } catch (err) {
    throw ApiError.forbidden("Недійсний або прострочений refresh-токен");
  }
};

export const revokeRefreshToken = (token: string) =>
  RefreshSession.deleteOne({ tokenHash: hashToken(token) });

export const getCurrentUser = async (userId: string) => {
  const user = await User.findById(userId).select("-password");
  if (!user) throw ApiError.notFound("Користувача не знайдено");
  return user;
};
