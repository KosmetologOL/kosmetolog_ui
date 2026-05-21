import { Router } from "express";
import * as ReportsController from "../controllers/reports.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", ReportsController.getAll);
router.get("/patient/:patientId", ReportsController.getByPatientId);
router.get("/:id", ReportsController.getById);
router.post("/", ReportsController.create);
router.put("/:id", ReportsController.update);

export default router;
