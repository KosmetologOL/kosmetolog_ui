import express from "express";
import * as PatientController from "../controllers/patient.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { validateObjectIdParams } from "../utils/objectId";
import {
  patientBodySchema,
  patientListQuerySchema,
} from "../validators/patient.validation";

const router = express.Router();

router.use(authMiddleware);
router.get(
  "/",
  validate(patientListQuerySchema, "query"),
  PatientController.getAllPatients,
);
router.get(
  "/:id",
  validateObjectIdParams("id"),
  PatientController.getPatientById,
);
router.post("/", validate(patientBodySchema), PatientController.createPatient);
router.put(
  "/:id",
  validateObjectIdParams("id"),
  validate(patientBodySchema),
  PatientController.updatePatient,
);
router.delete(
  "/:id",
  requireRoles("admin"),
  validateObjectIdParams("id"),
  PatientController.deletePatient,
);

export default router;
