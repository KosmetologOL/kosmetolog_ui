import express from "express";
import * as PatientController from "../controllers/patient.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";

const router = express.Router();

router.use(authMiddleware);
router.get("/", PatientController.getAllPatients);
router.get("/:id", PatientController.getPatientById);
router.post("/", PatientController.createPatient);
router.put("/:id", PatientController.updatePatient);
router.delete("/:id", requireRoles("admin"), PatientController.deletePatient);

export default router;
