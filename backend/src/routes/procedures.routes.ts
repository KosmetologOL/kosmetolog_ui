import { Router } from "express";
import * as ProceduresController from "../controllers/procedures.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { validateObjectIdParams } from "../utils/objectId";
import { nameWithRecommendationSchema } from "../validators/reference.validation";

const router = Router();

router.use(authMiddleware);
router.get(
  "/",
  requireRoles("admin", "doctor"),
  ProceduresController.getAllProcedures,
);
router.get(
  "/:query",
  requireRoles("admin", "doctor"),
  ProceduresController.searchProcedures,
);
router.post(
  "/",
  requireRoles("admin"),
  validate(nameWithRecommendationSchema),
  ProceduresController.createProcedure,
);
router.put(
  "/:id",
  requireRoles("admin"),
  validateObjectIdParams("id"),
  validate(nameWithRecommendationSchema),
  ProceduresController.updateProcedure,
);
router.delete(
  "/:id",
  requireRoles("admin"),
  validateObjectIdParams("id"),
  ProceduresController.deleteProcedure,
);

export default router;
