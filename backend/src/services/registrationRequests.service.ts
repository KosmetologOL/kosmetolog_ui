import bcrypt from "bcryptjs";
import ActivityLog from "../models/ActivityLog";
import RegistrationRequest from "../models/RegistrationRequest";
import User from "../models/UserSchema";
import ApiError from "../utils/ApiError";

export const listRegistrationRequests = async () => {
  return RegistrationRequest.find().select("-passwordHash");
};

// Тексти «вже існує» розкривають наявність заявки — усвідомлений компроміс для
// внутрішнього продукту, симетричний коментарю над register() в auth.service.
// Нейтралізувати їх без email-розсилки означало б зробити реєстрацію німою.
// Гілку login вирівняно (D7), бо там інформативність нічого не давала.
export const createRegistrationRequest = async (
  email: string,
  password: string,
  role = "doctor",
  name = "",
) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.badRequest("Користувач з таким email вже існує");
  }

  const existingRequest = await RegistrationRequest.findOne({ email });
  if (existingRequest) {
    throw ApiError.badRequest("Запит на реєстрацію вже існує");
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const request = new RegistrationRequest({ email, passwordHash, role, name });
  await request.save();
  await ActivityLog.create({ action: "registration-request", meta: { email } });

  return request;
};

export const approveRegistration = async (
  requestId: string,
  approverId?: string,
) => {
  const request = await RegistrationRequest.findById(requestId);
  if (!request) {
    throw ApiError.notFound("Запит не знайдено");
  }

  // Перевірка на зайнятий email робиться і тут, а не лише при створенні заявки:
  // між створенням і підтвердженням хтось міг самозареєструватися з тим самим email.
  const existingUser = await User.findOne({ email: request.email });
  if (existingUser) {
    await RegistrationRequest.findByIdAndDelete(requestId);
    throw ApiError.badRequest("Користувач з таким email вже існує");
  }

  // Свідомо пишемо повз Mongoose: passwordHash у заявці вже захешований,
  // а pre-save хук UserSchema захешував би його вдруге.
  const inserted = await User.collection
    .insertOne({
      email: request.email,
      password: request.passwordHash,
      // insertOne пише повз Mongoose, тож сеттер lowercase зі схеми тут не
      // спрацює — нормалізуємо роль явно.
      role: (request.role || "doctor").toLowerCase(),
      name: request.name || "",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .catch(async (err: { code?: number }): Promise<never> => {
      // гонка, що просочилася повз перевірку вище: unique-індекс на email
      if (err?.code === 11000) {
        await RegistrationRequest.findByIdAndDelete(requestId);
        throw ApiError.badRequest("Користувач з таким email вже існує");
      }
      throw err;
    });

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

export const rejectRegistration = async (requestId: string) => {
  const request = await RegistrationRequest.findByIdAndDelete(requestId);
  if (!request) {
    throw ApiError.notFound("Запит не знайдено");
  }

  await ActivityLog.create({
    action: "rejected-registration",
    meta: { email: request.email },
  });

  return request;
};
