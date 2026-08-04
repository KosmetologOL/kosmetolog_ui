import ActivityLog from "../models/ActivityLog";
import Category, { CategoryReportPosition } from "../models/Category";
import CategoryItem from "../models/CategoryItem";

export const listCategories = async () => {
  return Category.find();
};

export const createCategory = async (
  name: string,
  showNameInReport?: boolean,
  reportPosition?: CategoryReportPosition,
) => {
  const existing = await Category.findOne({ name });
  if (existing) {
    throw new Error("Категорія вже існує");
  }

  const category = new Category({
    name,
    ...(showNameInReport !== undefined ? { showNameInReport } : {}),
    ...(reportPosition ? { reportPosition } : {}),
  });
  await category.save();
  await ActivityLog.create({ action: "create-category", meta: { name } });

  return category;
};

export const updateCategory = async (
  id: string,
  name: string,
  showNameInReport?: boolean,
  reportPosition?: CategoryReportPosition,
) => {
  const update: Record<string, unknown> = { name };
  if (showNameInReport !== undefined) update.showNameInReport = showNameInReport;
  if (reportPosition) update.reportPosition = reportPosition;

  const category = await Category.findByIdAndUpdate(id, update, { new: true });
  if (!category) {
    throw new Error("Категорію не знайдено");
  }

  await ActivityLog.create({ action: "update-category", meta: { id, name } });
  return category;
};

export const deleteCategory = async (id: string) => {
  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    throw new Error("Категорію не знайдено");
  }

  await ActivityLog.create({
    action: "delete-category",
    meta: { id, name: category.name },
  });

  return category;
};

export const listCategoryItems = async (categoryId: string) => {
  return CategoryItem.find({ category: categoryId });
};

export const createCategoryItem = async (
  categoryId: string,
  name: string,
  recommendation?: string,
) => {
  const item = new CategoryItem({ category: categoryId, name, recommendation });
  await item.save();
  await ActivityLog.create({
    action: "create-category-item",
    meta: { categoryId, name },
  });

  return item;
};

export const updateCategoryItem = async (
  itemId: string,
  name: string,
  recommendation?: string,
) => {
  const item = await CategoryItem.findByIdAndUpdate(
    itemId,
    { name, recommendation },
    { new: true },
  );

  if (!item) {
    throw new Error("Елемент не знайдено");
  }

  await ActivityLog.create({
    action: "update-category-item",
    meta: { itemId, name },
  });

  return item;
};

export const deleteCategoryItem = async (itemId: string) => {
  const item = await CategoryItem.findByIdAndDelete(itemId);
  if (!item) {
    throw new Error("Елемент не знайдено");
  }

  await ActivityLog.create({
    action: "delete-category-item",
    meta: { itemId },
  });

  return item;
};
