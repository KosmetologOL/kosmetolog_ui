import { Router } from "express";
import adminRoutes from "./admin.routes";
import authRoutes from "./auth.routes";
import examsRoutes from "./exams.routes";
import homeCareRoutes from "./homeCareRoutes";
import medicationsRoutes from "./medications.routes";
import patientRoutes from "./patient.routes";
import proceduresRoutes from "./procedures.routes";
import reportsRoutes from "./reports.routes";
import specialistsRoutes from "./specialist.routes";

const router = Router();

router.use("/exams", examsRoutes);
router.use("/medications", medicationsRoutes);
router.use("/procedures", proceduresRoutes);
router.use("/reports", reportsRoutes);
router.use("/specialists", specialistsRoutes);
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/patients", patientRoutes);
router.use("/home-cares", homeCareRoutes);

export default router;
