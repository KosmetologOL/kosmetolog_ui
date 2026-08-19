import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { MONGODB_URI } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";
import routes from "./routes";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173/",
    credentials: true,
  }),
);
app.use(cookieParser());
// Масовий імпорт довідників — це книга з тисячами рядків і довгими
// рекомендаціями, у стандартні 100 КБ вона не влазить. Ліміт піднято точково
// саме для цього шляху; решта API лишається з дефолтом.
app.use("/reference-sync", express.json({ limit: "20mb" }));
// Рекомендації та «важливі тексти» не обмежені за довжиною у валідаторах, тож
// стандартні 100 КБ на тіло зробили б це обмеження де-факто. Стеля 10 МБ
// лишається нижчою за ліміт документа MongoDB (16 МБ).
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/", routes);

app.use(notFound);

app.use(errorHandler);

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB error:", error));

export default app;
