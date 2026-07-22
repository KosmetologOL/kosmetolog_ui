import express from "express";
import * as ExamsController from "../controllers/exams.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { validateObjectIdParams } from "../utils/objectId";
import { nameWithRecommendationSchema } from "../validators/reference.validation";

const router = express.Router();

router.use(authMiddleware);
router.get("/", requireRoles("admin", "doctor"), ExamsController.getAllExams);
router.get(
  "/:query",
  requireRoles("admin", "doctor"),
  ExamsController.searchExams,
);
router.post(
  "/",
  requireRoles("admin"),
  validate(nameWithRecommendationSchema),
  ExamsController.createExam,
);
router.put(
  "/:id",
  requireRoles("admin"),
  validateObjectIdParams("id"),
  validate(nameWithRecommendationSchema),
  ExamsController.updateExam,
);
router.delete(
  "/:id",
  requireRoles("admin"),
  validateObjectIdParams("id"),
  ExamsController.deleteExam,
);

export default router;
