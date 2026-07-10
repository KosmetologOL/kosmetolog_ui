import { Router } from "express";
import * as DoctorsController from "../controllers/doctors.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware, requireRoles("admin"));
router.get("/", DoctorsController.getDoctors);
router.patch("/:id/active", DoctorsController.setDoctorActive);
router.delete("/:id", DoctorsController.deleteDoctor);

export default router;
