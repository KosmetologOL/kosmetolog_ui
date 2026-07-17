import { Router } from "express";
import * as DoctorsController from "../controllers/doctors.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { validateObjectIdParams } from "../utils/objectId";
import { setDoctorActiveSchema } from "../validators/doctor.validation";

const router = Router();

router.use(authMiddleware, requireRoles("admin"));
router.get("/", DoctorsController.getDoctors);
router.patch(
  "/:id/active",
  validateObjectIdParams("id"),
  validate(setDoctorActiveSchema),
  DoctorsController.setDoctorActive,
);
router.delete(
  "/:id",
  validateObjectIdParams("id"),
  DoctorsController.deleteDoctor,
);

export default router;
