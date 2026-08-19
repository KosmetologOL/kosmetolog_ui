import { Router } from "express";
import * as ReferenceSyncController from "../controllers/referenceSync.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { referenceImportSchema } from "../validators/referenceSync.validation";

const router = Router();

router.use(authMiddleware);

router.get("/export", requireRoles("admin"), ReferenceSyncController.exportReferences);

// Прев'ю нічого не пише: рахує той самий план, що виконає /import.
router.post(
  "/import/preview",
  requireRoles("admin"),
  validate(referenceImportSchema),
  ReferenceSyncController.previewImport,
);

router.post(
  "/import",
  requireRoles("admin"),
  validate(referenceImportSchema),
  ReferenceSyncController.applyImport,
);

export default router;
