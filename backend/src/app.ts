import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { CLIENT_URL } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";
import routes from "./routes";

const app = express();

// CSP для чистого JSON-API не потрібна; решта заголовків (nosniff, HSTS,
// frameguard) — за замовчуванням.
app.use(helmet({ contentSecurityPolicy: false }));

// Довідники та листи — це довгі українські тексти, gzip стискає такий JSON у
// рази. Відповіді менші за 1 КБ compression пропускає без стиснення.
app.use(compression());

// За реверс-проксі (nginx/Cloudflare) довіряємо першому хопу,
// щоб req.ip був IP клієнта, а не проксі (потрібно для rate-limit).
// Якщо хопів більше — виставити фактичну кількість.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: CLIENT_URL,
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

// Публічний health-check для зовнішнього моніторингу (пінгер, оркестратор):
// без авторизації, 503 поки немає живого зʼєднання з MongoDB.
app.get("/health", (_req, res) => {
  const ok = mongoose.connection.readyState === 1;
  res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "degraded" });
});

app.use("/", routes);

app.use(notFound);

app.use(errorHandler);

export default app;
