import { Router } from "express";
import * as CategoriesController from "../controllers/categories.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", requireRoles("admin", "doctor"), CategoriesController.getCategories);
router.post("/", requireRoles("admin"), CategoriesController.createCategory);
router.patch("/:id", requireRoles("admin"), CategoriesController.updateCategory);
router.delete("/:id", requireRoles("admin"), CategoriesController.deleteCategory);

router.get(
  "/:categoryId/items",
  requireRoles("admin", "doctor"),
  CategoriesController.listCategoryItems,
);
router.post(
  "/:categoryId/items",
  requireRoles("admin"),
  CategoriesController.createCategoryItem,
);
router.patch(
  "/items/:itemId",
  requireRoles("admin"),
  CategoriesController.updateCategoryItem,
);
router.delete(
  "/items/:itemId",
  requireRoles("admin"),
  CategoriesController.deleteCategoryItem,
);

export default router;
