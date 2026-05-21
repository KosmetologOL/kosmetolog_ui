import express from "express";
import {
  createHomeCare,
  deleteHomeCare,
  getAllHomeCares,
  reorderHomeCares,
  updateHomeCare,
} from "../controllers/homeCareController";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";

const router = express.Router();

router.use(authMiddleware);
router.get("/", requireRoles("admin", "doctor"), getAllHomeCares);
router.post("/", requireRoles("admin"), createHomeCare);
router.put("/reorder", requireRoles("admin"), reorderHomeCares);
router.put("/:id", requireRoles("admin"), updateHomeCare);
router.delete("/:id", requireRoles("admin"), deleteHomeCare);

export default router;
