import mongoose, { Document, Schema } from "mongoose";

export interface IReportHomeCare {
  _id?: string;
  name: string;
  morning: boolean;
  evening: boolean;
  medicationName?: string;
  recommendations?: string;
}

export interface IReport extends Document {
  patient: mongoose.Types.ObjectId;
  medications: { name: string; recommendation: string }[];
  procedures: { name: string; recommendation: string }[];
  procedureStages: [
    {
      stage: String;
      procedures: [
        {
          name: String;
          comment: String;
          recommendation: String;
        },
      ];
    },
  ];
  exams: { name: string; recommendation: string }[];
  specialists: { name: string; query?: string }[];
  homeCares?: IReportHomeCare[];
  comments?: string;
  additionalInfo?: string;
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

const ReportSchema = new Schema<IReport>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    medications: [{ name: String, recommendation: String }],
    procedures: [{ name: String, recommendation: String }],
    procedureStages: [
      {
        stage: String,
        procedures: [
          {
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
    comments: String,
    additionalInfo: String,
  },
  { timestamps: true },
);

export default mongoose.model<IReport>("Report", ReportSchema);
