import mongoose, { Document, Schema } from "mongoose";

export interface IHospital extends Document {
  name: string;
  address?: string;
  phone?: string;
  active?: boolean;
}

const HospitalSchema: Schema<IHospital> = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model<IHospital>("Hospital", HospitalSchema);
