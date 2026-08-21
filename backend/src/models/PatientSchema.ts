import mongoose, { Document, Schema } from "mongoose";

export interface IPatient extends Document {
  fullName: string;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

// Список пацієнтів завжди сортується за датою створення (спадно) —
// без цього індексу кожна сторінка означає сортування всієї колекції в памʼяті.
PatientSchema.index({ createdAt: -1 });

export default mongoose.model<IPatient>("Patient", PatientSchema);
