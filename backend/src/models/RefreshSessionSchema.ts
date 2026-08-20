import mongoose, { Document, Schema } from "mongoose";

export interface IRefreshSession extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  rememberMe: boolean;
  expiresAt: Date;
}

const RefreshSessionSchema: Schema<IRefreshSession> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    rememberMe: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// Mongo сам прибирає прострочені сесії, але монітор TTL ходить раз на ~60 с,
// тож сервіс додатково звіряє expiresAt вручну.
RefreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IRefreshSession>(
  "RefreshSession",
  RefreshSessionSchema,
);
