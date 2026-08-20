import ActivityLog from "../models/ActivityLog";
import User from "../models/UserSchema";
import ApiError from "../utils/ApiError";

export const listDoctors = async () => {
  return User.find({ role: "doctor" }).select("-password");
};

export const toggleUserActive = async (id: string, active: boolean) => {
  const user = await User.findByIdAndUpdate(
    id,
    { active },
    { new: true },
  ).select("-password");

  if (!user) {
    throw ApiError.notFound("Користувача не знайдено");
  }

  await ActivityLog.create({ user: user._id, action: `set-active:${active}` });
  return user;
};

export const deleteDoctor = async (id: string) => {
  const doctor = await User.findOneAndDelete({ _id: id, role: "doctor" });

  if (!doctor) {
    throw ApiError.notFound("Лікаря не знайдено");
  }
};
