import { Router } from "express";
import * as ReportsController from "../controllers/reports.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { validateObjectIdParams } from "../utils/objectId";
import { reportSchema } from "../validators/report.validation";

const router = Router();

router.use(authMiddleware);
router.get("/", ReportsController.getAll);
router.get(
  "/patient/:patientId",
  validateObjectIdParams("patientId"),
  ReportsController.getByPatientId,
);
router.get("/:id", validateObjectIdParams("id"), ReportsController.getById);
router.post("/", validate(reportSchema), ReportsController.create);
router.put(
  "/:id",
  validateObjectIdParams("id"),
  validate(reportSchema),
  ReportsController.update,
);

export default router;
