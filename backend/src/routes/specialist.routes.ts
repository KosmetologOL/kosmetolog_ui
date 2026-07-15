import { Router } from "express";
import * as SpecialistController from "../controllers/specialist.contoller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { validateObjectIdParams } from "../utils/objectId";
import { nameOnlySchema } from "../validators/reference.validation";

const router = Router();

router.use(authMiddleware);
router.get("/", requireRoles("admin", "doctor"), SpecialistController.getAll);
router.get(
  "/:query",
  requireRoles("admin", "doctor"),
  SpecialistController.searchSpecialists,
);
router.post(
  "/",
  requireRoles("admin"),
  validate(nameOnlySchema),
  SpecialistController.createdSpecialist,
);
router.put(
  "/:id",
  requireRoles("admin"),
  validateObjectIdParams("id"),
  validate(nameOnlySchema),
  SpecialistController.updatedSpecialist,
);
router.delete(
  "/:id",
  requireRoles("admin"),
  validateObjectIdParams("id"),
  SpecialistController.deletedSpecialist,
);

export default router;
