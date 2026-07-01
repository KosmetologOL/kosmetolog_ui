import bcrypt from "bcryptjs";
import ActivityLog from "../models/ActivityLog";
import RegistrationRequest from "../models/RegistrationRequest";
import User from "../models/UserSchema";

export const listRegistrationRequests = async () => {
  return RegistrationRequest.find().select("-passwordHash");
};

export const createRegistrationRequest = async (
  email: string,
  password: string,
  role = "doctor",
  name = "",
) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Користувач з таким email вже існує");
  }

  const existingRequest = await RegistrationRequest.findOne({ email });
  if (existingRequest) {
    throw new Error("Запит на реєстрацію вже існує");
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
    throw new Error("Запит не знайдено");
  }

  const inserted = await User.collection.insertOne({
    email: request.email,
    password: request.passwordHash,
    role: request.role || "doctor",
    name: request.name || "",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
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
