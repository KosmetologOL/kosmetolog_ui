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

// Позиції завжди читаються в межах категорії, а назва в межах категорії
// має бути унікальною — один індекс покриває і фільтр, і захист від дублів.
CategoryItemSchema.index({ category: 1, name: 1 }, { unique: true });

export default mongoose.model<ICategoryItem>(
  "CategoryItem",
  CategoryItemSchema,
);
