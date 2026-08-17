import { Router } from "express";
import * as RegistrationRequestsController from "../controllers/registrationRequests.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";
import { validateObjectIdParams } from "../utils/objectId";

const router = Router();

router.use(authMiddleware, requireRoles("admin"));
router.get("/", RegistrationRequestsController.listRegistrationRequests);
router.post(
  "/:id/approve",
  validateObjectIdParams("id"),
  RegistrationRequestsController.approveRegistrationRequest,
);
router.delete(
  "/:id",
  validateObjectIdParams("id"),
  RegistrationRequestsController.rejectRegistrationRequest,
);

export default router;
