import { Router } from "express";
import {
  approveRegistrationRequest,
  createCategory,
  createCategoryItem,
  createHospital,
  deleteCategory,
  deleteCategoryItem,
  deleteHospital,
  getCategories,
  getDoctors,
  getHospitals,
  listCategoryItems,
  listRegistrationRequests,
  setUserActive,
  updateCategory,
  updateCategoryItem,
  updateHospital,
} from "../controllers/admin.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware, requireRoles("admin"));

router.get("/doctors", getDoctors);
router.patch("/users/:id/active", setUserActive);

router.get("/registration-requests", listRegistrationRequests);
router.post("/registration-requests/:id/approve", approveRegistrationRequest);

router.get("/categories", getCategories);
router.post("/categories", createCategory);
router.patch("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

router.get("/hospitals", getHospitals);
router.post("/hospitals", createHospital);
router.patch("/hospitals/:id", updateHospital);
router.delete("/hospitals/:id", deleteHospital);

router.get("/categories/:categoryId/items", listCategoryItems);
router.post("/categories/:categoryId/items", createCategoryItem);
router.patch("/items/:itemId", updateCategoryItem);
router.delete("/items/:itemId", deleteCategoryItem);

export default router;
