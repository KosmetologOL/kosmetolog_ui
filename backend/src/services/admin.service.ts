import bcrypt from "bcryptjs";
import ActivityLog from "../models/ActivityLog";
import Category from "../models/Category";
import CategoryItem from "../models/CategoryItem";
import Hospital from "../models/Hospital";
import RegistrationRequest from "../models/RegistrationRequest";
import User from "../models/UserSchema";

export const listDoctors = async () => {
  return User.find({ role: "doctor" }).select("-password");
};

export const toggleUserActive = async (id: string, active: boolean) => {
  const user = await User.findByIdAndUpdate(
    id,
    { active },
    { new: true },
  ).select("-password");
  if (!user) throw new Error("Користувача не знайдено");
  await ActivityLog.create({ user: user._id, action: `set-active:${active}` });
  return user;
};

export const getRegistrationRequests = async () => {
  return RegistrationRequest.find().select("-passwordHash");
};

export const createRegistrationRequest = async (
  email: string,
  password: string,
  role = "doctor",
) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("Користувач з таким email вже існує");

  const existingRequest = await RegistrationRequest.findOne({ email });
  if (existingRequest) throw new Error("Запит на реєстрацію вже існує");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const req = new RegistrationRequest({ email, passwordHash, role });
  await req.save();
  await ActivityLog.create({ action: "registration-request", meta: { email } });
  return req;
};

export const approveRegistration = async (
  requestId: string,
  approverId?: string,
) => {
  const req = await RegistrationRequest.findById(requestId);
  if (!req) throw new Error("Запит не знайдено");

  const user = new User({
    email: req.email,
    password: req.passwordHash,
    role: req.role || "doctor",
  });

  // passwordHash is already hashed; place into password field without re-hashing
  // but the pre-save hook will re-hash only if modified; mark as not modified by directly setting isModified false
  user.password = req.passwordHash as any;
  // Ensure mongoose does not re-hash: set isModified to false by skipping middleware: save with { validateBeforeSave: false } won't skip pre save; instead we will create using collection insert

  const inserted = await (User.collection.insertOne({
    email: user.email,
    password: user.password,
    role: user.role,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as any);

  const createdUser = await User.findById(inserted.insertedId).select(
    "-password",
  );

  await RegistrationRequest.findByIdAndDelete(requestId);
  await ActivityLog.create({
    user: createdUser?._id,
    action: "approved-registration",
    meta: { approver: approverId },
  });
  return createdUser;
};

// Categories
export const listCategories = async () => {
  return Category.find();
};

export const createCategory = async (name: string) => {
  const existing = await Category.findOne({ name });
  if (existing) throw new Error("Категорія вже існує");
  const cat = new Category({ name });
  await cat.save();
  await ActivityLog.create({ action: "create-category", meta: { name } });
  return cat;
};

export const updateCategory = async (id: string, name: string) => {
  const cat = await Category.findByIdAndUpdate(id, { name }, { new: true });
  if (!cat) throw new Error("Категорію не знайдено");
  await ActivityLog.create({ action: "update-category", meta: { id, name } });
  return cat;
};

export const deleteCategory = async (id: string) => {
  const cat = await Category.findByIdAndDelete(id);
  if (!cat) throw new Error("Категорію не знайдено");
  await ActivityLog.create({
    action: "delete-category",
    meta: { id, name: cat.name },
  });
  return cat;
};

// Hospitals
export const listHospitals = async () => {
  return Hospital.find();
};

export const createHospital = async (payload: {
  name: string;
  address?: string;
  phone?: string;
}) => {
  const h = new Hospital(payload);
  await h.save();
  await ActivityLog.create({
    action: "create-hospital",
    meta: { name: h.name },
  });
  return h;
};

export const updateHospital = async (
  id: string,
  payload: Partial<{
    name: string;
    address: string;
    phone: string;
    active: boolean;
  }>,
) => {
  const h = await Hospital.findByIdAndUpdate(id, payload, { new: true });
  if (!h) throw new Error("Лікарню не знайдено");
  await ActivityLog.create({ action: "update-hospital", meta: { id } });
  return h;
};

export const deleteHospital = async (id: string) => {
  const h = await Hospital.findByIdAndDelete(id);
  if (!h) throw new Error("Лікарню не знайдено");
  await ActivityLog.create({
    action: "delete-hospital",
    meta: { id, name: h.name },
  });
  return h;
};

// Category Items
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
  if (!item) throw new Error("Елемент не знайдено");
  await ActivityLog.create({
    action: "update-category-item",
    meta: { itemId, name },
  });
  return item;
};

export const deleteCategoryItem = async (itemId: string) => {
  const item = await CategoryItem.findByIdAndDelete(itemId);
  if (!item) throw new Error("Елемент не знайдено");
  await ActivityLog.create({
    action: "delete-category-item",
    meta: { itemId },
  });
  return item;
};
