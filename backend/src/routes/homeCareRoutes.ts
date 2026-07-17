import express from "express";
import {
  createHomeCare,
  deleteHomeCare,
  getAllHomeCares,
  reorderHomeCares,
  updateHomeCare,
} from "../controllers/homeCareController";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { validateObjectIdParams } from "../utils/objectId";
import {
  homeCareSchema,
  homeCareSearchQuerySchema,
  reorderHomeCareSchema,
} from "../validators/homeCare.validation";

const router = express.Router();

router.use(authMiddleware);
router.get(
  "/",
  requireRoles("admin", "doctor"),
  validate(homeCareSearchQuerySchema, "query"),
  getAllHomeCares,
);
router.post("/", requireRoles("admin"), validate(homeCareSchema), createHomeCare);
router.put(
  "/reorder",
  requireRoles("admin"),
  validate(reorderHomeCareSchema),
  reorderHomeCares,
);
router.put(
  "/:id",
  requireRoles("admin"),
  validateObjectIdParams("id"),
  validate(homeCareSchema),
  updateHomeCare,
);
router.delete(
  "/:id",
  requireRoles("admin"),
  validateObjectIdParams("id"),
  deleteHomeCare,
);

export default router;
