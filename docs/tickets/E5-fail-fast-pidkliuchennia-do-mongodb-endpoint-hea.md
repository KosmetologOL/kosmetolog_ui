# E5 · Fail-fast підключення до MongoDB, ендпойнт /health і graceful shutdown

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Бекенд і експлуатація | — |

## Контекст

mongoose.connect зараз викликається як побічний ефект імпорту app.ts (рядки 28–31), і помилка підключення лише логується в console.error, а server.ts безумовно викликає app.listen. Якщо Mongo недоступна на старті, процес живе «зомбі»: приймає запити, кожен з яких висить ~10 секунд до buffering-таймаута Mongoose і падає з 500. Немає ендпойнта /health для зовнішнього моніторингу, немає логування подій disconnected/reconnected, немає обробників SIGINT/SIGTERM (in-flight запити при рестарті обриваються, зʼєднання з БД не закривається коректно) і немає обробників uncaughtException/unhandledRejection — у Node 15+ unhandled rejection вбиває процес, а процес-менеджера поки немає, тож сервіс лежатиме до ручного рестарту.

## Кроки реалізації

1. backend/src/app.ts: видалити блок mongoose.connect (рядки 28–31) і імпорт MONGODB_URI (рядок 5); імпорт mongoose лишити — потрібен для /health.
2. backend/src/app.ts: перед `app.use("/", routes)` (рядок 22) додати публічний health-check без авторизації: `app.get("/health", (_req, res) => { const ok = mongoose.connection.readyState === 1; res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "degraded" }); });`
3. Повністю переписати backend/src/server.ts (готовий код): `import "dotenv/config"; import mongoose from "mongoose"; import app from "./app"; import { MONGODB_URI } from "./config/env"; const PORT = process.env.PORT || 5000; const start = async () => { try { await mongoose.connect(MONGODB_URI); console.log("Connected to MongoDB"); } catch (error) { console.error("MongoDB connection error:", error); process.exit(1); } const server = app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); }); mongoose.connection.on("disconnected", () => console.error("MongoDB disconnected")); mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected")); mongoose.connection.on("error", (err) => console.error("MongoDB error:", err)); const shutdown = (signal: string) => { console.log(`${signal} received, shutting down`); server.close(() => { mongoose.disconnect().then(() => process.exit(0)); }); setTimeout(() => process.exit(1), 10_000).unref(); }; process.on("SIGINT", () => shutdown("SIGINT")); process.on("SIGTERM", () => shutdown("SIGTERM")); process.on("uncaughtException", (err) => { console.error("uncaughtException:", err); process.exit(1); }); process.on("unhandledRejection", (reason) => { console.error("unhandledRejection:", reason); process.exit(1); }); }; start();` — важливо: `import "dotenv/config"` має лишитися ПЕРШИМ імпортом, бо config/env.ts читає process.env при завантаженні.
4. Занотувати для тікета E6 (DEPLOY.md): підключити зовнішній пінгер (UptimeRobot/Healthchecks.io) на GET /health.

## Критерії приймання

- [ ] З несправним MONGODB_URI процес завершується з кодом 1 і не слухає порт — жодних «зомбі»-запитів по 10 секунд.
- [ ] app.listen викликається лише після успішного mongoose.connect.
- [ ] GET /health доступний без Authorization: 200 {"status":"ok"} при живій БД, 503 при відірваній.
- [ ] SIGINT/SIGTERM завершують процес коректно (server.close + mongoose.disconnect) не довше ніж за 10 секунд.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. `MONGODB_URI="mongodb://127.0.0.1:1/void" npm run dev` у backend/ → процес падає з помилкою підключення; `lsof -i :5000` порожній.
2. Зі справним .env: `curl http://localhost:5000/health` без токена → 200 {"status":"ok"}.
3. `kill -TERM <pid>` запущеного сервера → у логах повідомлення про shutdown, процес завершується протягом 10 с з кодом 0.
4. `cd backend && npm run build` — без помилок типів.

## Файли

- `backend/src/app.ts`
- `backend/src/server.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Сервер стартує і працює без MongoDB: немає fail-fast, health-check і логування стану зʼєднання»
- «Сервер стартує і живе без БД: помилка connect лише логується, немає обробки розривів і graceful shutdown»
- «Немає graceful shutdown і глобальних обробників помилок процесу»
