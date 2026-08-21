import { NextFunction, Response } from "express";
import {
  AuthenticatedRequest,
  RequestUser,
} from "../middlewares/auth.middleware";
import * as RegistrationRequestsService from "../services/registrationRequests.service";
import ApiError from "../utils/ApiError";

export const listRegistrationRequests = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requests = await RegistrationRequestsService.listRegistrationRequests();
    res.json({ requests });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const approveRegistrationRequest = async (
  req: AuthenticatedRequest & { user?: RequestUser },
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const user = await RegistrationRequestsService.approveRegistration(
      id,
      req.user?.id,
    );
    res.json({ user, message: "Підтверджено" });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};

export const rejectRegistrationRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    await RegistrationRequestsService.rejectRegistration(id);
    res.json({ message: "Запит відхилено" });
  } catch (err) {
    console.error(err);
    next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
  }
};
