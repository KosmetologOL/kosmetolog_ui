import express from "express";
import * as ExamsController from "../controllers/exams.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";

const router = express.Router();

router.use(authMiddleware);
router.get("/", requireRoles("admin", "doctor"), ExamsController.getAllExams);
router.get(
  "/:query",
  requireRoles("admin", "doctor"),
  ExamsController.searchExams,
);
router.post("/", requireRoles("admin"), ExamsController.createExam);
router.put("/:id", requireRoles("admin"), ExamsController.updateExam);
router.delete("/:id", requireRoles("admin"), ExamsController.deleteExam);

export default router;
