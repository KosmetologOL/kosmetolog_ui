import mongoose, { Document, Schema } from "mongoose";

export interface IActivityLog extends Document {
  user?: mongoose.Types.ObjectId;
  action: string;
  meta?: Record<string, any>;
}

const ActivityLogSchema: Schema<IActivityLog> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export default mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
