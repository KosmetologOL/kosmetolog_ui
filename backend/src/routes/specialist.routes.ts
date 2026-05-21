import { Router } from "express";
import * as SpecialistController from "../controllers/specialist.contoller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", requireRoles("admin", "doctor"), SpecialistController.getAll);
router.get(
  "/:query",
  requireRoles("admin", "doctor"),
  SpecialistController.searchSpecialists,
);
router.post("/", requireRoles("admin"), SpecialistController.createdSpecialist);
router.put(
  "/:id",
  requireRoles("admin"),
  SpecialistController.updatedSpecialist,
);
router.delete(
  "/:id",
  requireRoles("admin"),
  SpecialistController.deletedSpecialist,
);

export default router;
