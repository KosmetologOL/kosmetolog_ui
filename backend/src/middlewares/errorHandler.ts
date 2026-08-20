import { NextFunction, Request, Response } from "express";
import ApiError from "../utils/ApiError";

export const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error("Error:", err);

  // body-parser відкидає завелике тіло ще до контролера і кидає власну помилку
  // з англомовним "request entity too large" — підміняємо на українську.
  if ((err as { type?: string }).type === "entity.too.large") {
    return res.status(413).json({ message: "Занадто великий обсяг даних" });
  }

  const status = err.status || 500;
  const message = err.message || "Внутрішня помилка сервера";

  res.status(status).json({ message });
};
