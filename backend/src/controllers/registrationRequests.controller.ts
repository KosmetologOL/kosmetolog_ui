import { Response } from "express";
import {
  AuthenticatedRequest,
  RequestUser,
} from "../middlewares/auth.middleware";
import * as RegistrationRequestsService from "../services/registrationRequests.service";

export const listRegistrationRequests = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const requests = await RegistrationRequestsService.listRegistrationRequests();
    res.json({ requests });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const approveRegistrationRequest = async (
  req: AuthenticatedRequest & { user?: RequestUser },
  res: Response,
) => {
  try {
    const { id } = req.params;
    const user = await RegistrationRequestsService.approveRegistration(
      id,
      req.user?.id,
    );
    res.json({ user, message: "Approved" });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};
