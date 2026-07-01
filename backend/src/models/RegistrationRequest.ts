import mongoose, { Document, Schema } from "mongoose";

export interface IRegistrationRequest extends Document {
  email: string;
  passwordHash: string;
  name?: string;
  role?: string;
}

const RegistrationRequestSchema: Schema<IRegistrationRequest> = new Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "" },
    role: { type: String, default: "doctor" },
  },
  { timestamps: true },
);

export default mongoose.model<IRegistrationRequest>(
  "RegistrationRequest",
  RegistrationRequestSchema,
);
