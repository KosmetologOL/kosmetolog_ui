import mongoose, { Document, Schema } from "mongoose";

export interface ISpecialist extends Document {
  name: string;
  query?: string;
}

const SpecialistSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  query: { type: String },
});

export default mongoose.model<ISpecialist>("Specialist", SpecialistSchema);
