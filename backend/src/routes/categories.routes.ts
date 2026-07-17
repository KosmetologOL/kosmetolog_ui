import { Router } from "express";
import * as CategoriesController from "../controllers/categories.controller";
import { authMiddleware, requireRoles } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { validateObjectIdParams } from "../utils/objectId";
import {
  categoryItemSchema,
  categorySchema,
} from "../validators/category.validation";

const router = Router();

router.use(authMiddleware);
router.get("/", requireRoles("admin", "doctor"), CategoriesController.getCategories);
router.post(
  "/",
  requireRoles("admin"),
  validate(categorySchema),
  CategoriesController.createCategory,
);
router.patch(
  "/:id",
  requireRoles("admin"),
  validateObjectIdParams("id"),
  validate(categorySchema),
  CategoriesController.updateCategory,
);
router.delete(
  "/:id",
  requireRoles("admin"),
  validateObjectIdParams("id"),
  CategoriesController.deleteCategory,
);

router.get(
  "/:categoryId/items",
  requireRoles("admin", "doctor"),
  validateObjectIdParams("categoryId"),
  CategoriesController.listCategoryItems,
);
router.post(
  "/:categoryId/items",
  requireRoles("admin"),
  validateObjectIdParams("categoryId"),
  validate(categoryItemSchema),
  CategoriesController.createCategoryItem,
);
router.patch(
  "/items/:itemId",
  requireRoles("admin"),
  validateObjectIdParams("itemId"),
  validate(categoryItemSchema),
  CategoriesController.updateCategoryItem,
);
router.delete(
  "/items/:itemId",
  requireRoles("admin"),
  validateObjectIdParams("itemId"),
  CategoriesController.deleteCategoryItem,
);

export default router;
