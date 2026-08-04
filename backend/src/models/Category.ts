import mongoose, { Document, Schema } from "mongoose";

export const CATEGORY_REPORT_POSITIONS = [
  "after_specialists",
  "after_exams",
  "after_medications",
  "after_homecare",
  "after_procedure_stages",
  "after_procedures",
] as const;

export type CategoryReportPosition = (typeof CATEGORY_REPORT_POSITIONS)[number];

export interface ICategory extends Document {
  name: string;
  showNameInReport: boolean;
  reportPosition: CategoryReportPosition;
}

const CategorySchema: Schema<ICategory> = new Schema(
  {
    name: { type: String, required: true, unique: true },
    showNameInReport: { type: Boolean, default: true },
    reportPosition: {
      type: String,
      enum: CATEGORY_REPORT_POSITIONS,
      default: "after_homecare",
    },
  },
  { timestamps: true },
);

export default mongoose.model<ICategory>("Category", CategorySchema);
