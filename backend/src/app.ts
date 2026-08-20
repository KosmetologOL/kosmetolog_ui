import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { MONGODB_URI } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";
import routes from "./routes";

const app = express();

// За реверс-проксі (nginx/Cloudflare) довіряємо першому хопу,
// щоб req.ip був IP клієнта, а не проксі (потрібно для rate-limit).
// Якщо хопів більше — виставити фактичну кількість.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173/",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", routes);

app.use(notFound);

app.use(errorHandler);

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB error:", error));

export default app;
