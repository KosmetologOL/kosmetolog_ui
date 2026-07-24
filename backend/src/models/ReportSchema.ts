import mongoose, { Document, Schema } from "mongoose";

export interface IReportHomeCare {
  _id?: string;
  name: string;
  morning: boolean;
  evening: boolean;
  medicationName?: string;
  recommendations?: string;
}

export interface IReportCategoryItem {
  _id?: string;
  categoryId?: string;
  categoryName: string;
  itemName: string;
  recommendation?: string;
}

export interface IReportEditHistoryItem {
  action: "create" | "update";
  editedAt: Date;
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
}

export interface IReportProcedureStage {
  stage: string;
  procedures: {
    _id?: string;
    name: string;
    comment?: string;
    recommendation?: string;
  }[];
}

export interface IReport extends Document {
  patient: mongoose.Types.ObjectId;
  medications: { name: string; recommendation: string }[];
  procedures: {
    name: string;
    comment?: string;
    recommendation: string;
    stage?: string;
  }[];
  procedureStages: IReportProcedureStage[];
  exams: { name: string; recommendation: string }[];
  specialists: { name: string; query?: string }[];
  homeCares?: IReportHomeCare[];
  categories?: IReportCategoryItem[];
  comments?: string;
  additionalInfo?: string;
  finalNote?: string;
  editHistory?: IReportEditHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

const HomeCareSubSchema = new Schema<IReportHomeCare>(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    name: { type: String, required: true },
    morning: { type: Boolean, default: false },
    evening: { type: Boolean, default: false },
    medicationName: { type: String, default: "" },
    recommendations: { type: String, default: "" },
  },
  { _id: false },
);

const CategoryItemSubSchema = new Schema<IReportCategoryItem>(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    categoryId: { type: String, default: "" },
    categoryName: { type: String, required: true },
    itemName: { type: String, required: true },
    recommendation: { type: String, default: "" },
  },
  { _id: false },
);

const EditHistorySubSchema = new Schema<IReportEditHistoryItem>(
  {
    action: { type: String, enum: ["create", "update"], required: true },
    editedAt: { type: Date, default: Date.now },
    userId: { type: String, default: "" },
    email: { type: String, default: "" },
    name: { type: String, default: "" },
    role: { type: String, default: "" },
  },
  { _id: false },
);

const ReportSchema = new Schema<IReport>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    medications: [{ name: String, recommendation: String }],
    procedures: [
      { name: String, comment: String, recommendation: String, stage: String },
    ],
    procedureStages: [
      {
        stage: String,
        procedures: [
          {
            _id: String,
            name: String,
            comment: String,
            recommendation: String,
          },
        ],
      },
    ],
    exams: [{ name: String, recommendation: String }],
    specialists: [{ name: String, query: String }],
    homeCares: [HomeCareSubSchema],
    categories: [CategoryItemSubSchema],
    comments: String,
    additionalInfo: String,
    finalNote: String,
    editHistory: [EditHistorySubSchema],
  },
  { timestamps: true },
);

export default mongoose.model<IReport>("Report", ReportSchema);
