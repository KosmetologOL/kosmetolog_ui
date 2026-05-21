import { Router } from "express";
import * as MedicationsController from "../controllers/medications.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";

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
router.post("/", requireRoles("admin"), MedicationsController.createMedication);
router.put(
  "/:id",
  requireRoles("admin"),
  MedicationsController.updateMedication,
);
router.delete(
  "/:id",
  requireRoles("admin"),
  MedicationsController.deleteMedication,
);

export default router;
