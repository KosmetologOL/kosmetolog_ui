import { Router } from "express";
import authRoutes from "./auth.routes";
import categoriesRoutes from "./categories.routes";
import doctorsRoutes from "./doctors.routes";
import examsRoutes from "./exams.routes";
import homeCareRoutes from "./homeCareRoutes";
import medicationsRoutes from "./medications.routes";
import patientRoutes from "./patient.routes";
import proceduresRoutes from "./procedures.routes";
import registrationRequestsRoutes from "./registrationRequests.routes";
import reportsRoutes from "./reports.routes";
import specialistsRoutes from "./specialist.routes";

const router = Router();

router.use("/exams", examsRoutes);
router.use("/medications", medicationsRoutes);
router.use("/procedures", proceduresRoutes);
router.use("/reports", reportsRoutes);
router.use("/specialists", specialistsRoutes);
router.use("/auth", authRoutes);
router.use("/categories", categoriesRoutes);
router.use("/doctors", doctorsRoutes);
router.use("/registration-requests", registrationRequestsRoutes);
router.use("/patients", patientRoutes);
router.use("/home-cares", homeCareRoutes);

export default router;
