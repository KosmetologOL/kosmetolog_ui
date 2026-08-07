import mongoose, { Document, Schema } from "mongoose";

export interface ISettings extends Document {
  medicationsNote?: string;
  homeCareNote?: string;
  examsNote?: string;
  proceduresNote?: string;
}

const SettingsSchema = new Schema<ISettings>(
  {
    medicationsNote: { type: String, default: "" },
    homeCareNote: { type: String, default: "" },
    examsNote: { type: String, default: "" },
    proceduresNote: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model<ISettings>("Settings", SettingsSchema);
