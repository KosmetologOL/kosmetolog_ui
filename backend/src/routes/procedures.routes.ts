import { Router } from "express";
import * as ProceduresController from "../controllers/procedures.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";

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
router.post("/", requireRoles("admin"), ProceduresController.createProcedure);
router.put("/:id", requireRoles("admin"), ProceduresController.updateProcedure);
router.delete(
  "/:id",
  requireRoles("admin"),
  ProceduresController.deleteProcedure,
);

export default router;
