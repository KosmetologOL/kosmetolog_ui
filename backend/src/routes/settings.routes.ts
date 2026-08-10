import express from "express";
import * as SettingsController from "../controllers/settings.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { settingsSchema } from "../validators/settings.validation";

const router = express.Router();

router.use(authMiddleware);
router.get(
  "/",
  requireRoles("admin", "doctor"),
  SettingsController.getSettings,
);
router.put(
  "/",
  requireRoles("admin"),
  validate(settingsSchema),
  SettingsController.updateSettings,
);

export default router;
