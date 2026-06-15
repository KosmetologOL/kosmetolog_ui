import mongoose, { Document, Schema } from "mongoose";

export interface ICategoryItem extends Document {
  category: mongoose.Types.ObjectId;
  name: string;
  recommendation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryItemSchema = new Schema<ICategoryItem>(
  {
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    name: { type: String, required: true },
    recommendation: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model<ICategoryItem>(
  "CategoryItem",
  CategoryItemSchema,
);
