import { Router } from "express";
import * as MedicationsController from "../controllers/medications.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { validateObjectIdParams } from "../utils/objectId";
import {
  nameOnlySchema,
  nameWithRecommendationSchema,
} from "../validators/reference.validation";

const router = Router();

router.use(authMiddleware);
router.get(
  "/",
  requireRoles("admin", "doctor"),
  MedicationsController.getAllMedications,
);
router.get(
  "/:query",
  requireRoles("admin", "doctor"),
  MedicationsController.searchMedications,
);
router.post(
  "/",
  requireRoles("admin"),
  validate(nameWithRecommendationSchema),
  MedicationsController.createMedication,
);
router.put(
  "/:id",
  requireRoles("admin"),
  validateObjectIdParams("id"),
  validate(nameOnlySchema),
  MedicationsController.updateMedication,
);
router.delete(
  "/:id",
  requireRoles("admin"),
  validateObjectIdParams("id"),
  MedicationsController.deleteMedication,
);

export default router;
