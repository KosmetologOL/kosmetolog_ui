import mongoose, { Document, Schema } from "mongoose";

export interface IHomeCare extends Document {
  name: string;
  morning: boolean;
  evening: boolean;
  order: number;
}

const HomeCareSchema = new Schema<IHomeCare>({
  name: { type: String, required: true },
  morning: { type: Boolean, default: false },
  evening: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
});

export default mongoose.model<IHomeCare>("HomeCare", HomeCareSchema);
