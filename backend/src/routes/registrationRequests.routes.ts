import { Router } from "express";
import * as RegistrationRequestsController from "../controllers/registrationRequests.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware, requireRoles("admin"));
router.get("/", RegistrationRequestsController.listRegistrationRequests);
router.post("/:id/approve", RegistrationRequestsController.approveRegistrationRequest);

export default router;
