# E5 · Fail-fast підключення до MongoDB, ендпойнт /health і graceful shutdown

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Бекенд і експлуатація | — |

## Контекст

mongoose.connect зараз викликається як побічний ефект імпорту app.ts (рядки 28–31), і помилка підключення лише логується в console.error, а server.ts безумовно викликає app.listen. Якщо Mongo недоступна на старті, процес живе «зомбі»: приймає запити, кожен з яких висить ~10 секунд до buffering-таймаута Mongoose і падає з 500. Немає ендпойнта /health для зовнішнього моніторингу, немає логування подій disconnected/reconnected, немає обробників SIGINT/SIGTERM (in-flight запити при рестарті обриваються, зʼєднання з БД не закривається коректно) і немає обробників uncaughtException/unhandledRejection — у Node 15+ unhandled rejection вбиває процес, а процес-менеджера поки немає, тож сервіс лежатиме до ручного рестарту.

## Кроки реалізації

> **Номери рядків звірені з `dev` = `c768497` (2026-08-21).** Початкові номери в цьому
> тікеті писалися до хвиль E4/E7/D3 і вказували вже на чужий код. Перед правкою все одно
> орієнтуйся на назви символів, а не на номери.

1. backend/src/app.ts: видалити блок mongoose.connect — це **рядки 50–53** (у кінці файлу, перед `export default app;`), а не 28–31:
   ```
   mongoose
     .connect(MONGODB_URI)
     .then(() => console.log("Connected to MongoDB"))
     .catch((error) => console.error("MongoDB error:", error));
   ```
   **Імпорт із `config/env` — це рядок 7, і видаляти його цілком НЕ МОЖНА.** Після тікета E7 він спільний:
   `import { CLIENT_URL, MONGODB_URI } from "./config/env";` → має стати `import { CLIENT_URL } from "./config/env";`.
   `CLIENT_URL` використовується нижче в `cors({ origin: CLIENT_URL })` — видалення рядка зламає CORS.
   Імпорт `mongoose` лишити — потрібен для /health.
2. backend/src/app.ts: перед `app.use("/", routes)` (**рядок 44**, не 22) додати публічний health-check без авторизації: `app.get("/health", (_req, res) => { const ok = mongoose.connection.readyState === 1; res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "degraded" }); });`
3. Повністю переписати backend/src/server.ts (готовий код): `import "dotenv/config"; import mongoose from "mongoose"; import app from "./app"; import { MONGODB_URI } from "./config/env"; const PORT = process.env.PORT || 5000; const start = async () => { try { await mongoose.connect(MONGODB_URI); console.log("Connected to MongoDB"); } catch (error) { console.error("MongoDB connection error:", error); process.exit(1); } const server = app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); }); mongoose.connection.on("disconnected", () => console.error("MongoDB disconnected")); mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected")); mongoose.connection.on("error", (err) => console.error("MongoDB error:", err)); const shutdown = (signal: string) => { console.log(`${signal} received, shutting down`); server.close(() => { mongoose.disconnect().then(() => process.exit(0)); }); setTimeout(() => process.exit(1), 10_000).unref(); }; process.on("SIGINT", () => shutdown("SIGINT")); process.on("SIGTERM", () => shutdown("SIGTERM")); process.on("uncaughtException", (err) => { console.error("uncaughtException:", err); process.exit(1); }); process.on("unhandledRejection", (reason) => { console.error("unhandledRejection:", reason); process.exit(1); }); }; start();` — важливо: `import "dotenv/config"` має лишитися ПЕРШИМ імпортом, бо config/env.ts читає process.env при завантаженні.
4. Занотувати для тікета E6: `DEPLOY.md` ще не існує (CI на GitHub Actions уже є — `.github/workflows/ci.yml`); при створенні `DEPLOY.md` додати розділ про зовнішній пінгер (UptimeRobot/Healthchecks.io) на GET /health.
5. Дрібниці, які варто врахувати в коді кроку 3 (не обовʼязкові, але зекономлять хибні тривоги):
   - `mongoose.connect` за замовчуванням має `serverSelectionTimeoutMS = 30000`, тож fail-fast настає **приблизно через 30 с**, а не миттєво. Або передати `{ serverSelectionTimeoutMS: 5000 }`, або просто знати це під час перевірки.
   - слухач `disconnected` спрацьовує і на навмисному `mongoose.disconnect()` у штатному shutdown, тож кожен нормальний рестарт писатиме `console.error("MongoDB disconnected")`. Якщо додаєш прапорець `shuttingDown`, це прибирає хибну тривогу для майбутнього Sentry (E8).

## Критерії приймання

- [x] З несправним MONGODB_URI процес завершується з кодом 1 і не слухає порт — жодних «зомбі»-запитів по 10 секунд.
- [x] app.listen викликається лише після успішного mongoose.connect.
- [x] GET /health доступний без Authorization: 200 {"status":"ok"} при живій БД, 503 при відірваній.
- [x] SIGINT/SIGTERM завершують процес коректно (server.close + mongoose.disconnect) не довше ніж за 10 секунд.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

> **Порт — 5001, не 5000** (`backend/.env: PORT=5001`). На macOS порт 5000 зайнятий
> AirPlay Receiver (Control Center) і віддає `403 Server: AirTunes`, тож перевірки на
> 5000 дали б хибний результат. Якщо раннер експортував власний `PORT` — вживай його.
>
> **Проти прод-БД нічого не запускати.** Комітнутий `backend/.env` вказує на прод-кластер
> Atlas, у якого немає бекапів, тож «зі справним .env» тут означає **локальну тестову
> базу**, а не той URI, що лежить у файлі.

1. `MONGODB_URI="mongodb://127.0.0.1:1/void" npm run dev` у backend/ → процес падає з помилкою підключення (**через ~30 с** — це дефолтний `serverSelectionTimeoutMS`, а не зависання); `lsof -i :5001` порожній. Сам `ts-node-dev --respawn` при цьому лишається у вотчері — це очікувано, важливо лише що порт вільний.
2. З локальною тестовою БД (`MONGODB_URI=mongodb://127.0.0.1:27017/kosmetolog_test`, **НЕ прод-Atlas**): `curl http://localhost:5001/health` без токена → 200 {"status":"ok"}.
3. `kill -TERM <pid>` запущеного сервера → у логах повідомлення про shutdown, процес завершується протягом 10 с з кодом 0. `pid` брати з `pgrep -f "src/server.ts"` (дочірній node), а не з `ts-node-dev`.
4. **Перевірка гілки 503** (без неї критерій 3 лишається неперевіреним): за живого сервера зупинити локальний mongod → `curl http://localhost:5001/health` → 503 {"status":"degraded"} і `MongoDB disconnected` у логах; підняти mongod назад → 200 {"status":"ok"} і `MongoDB reconnected`. Зупиняти треба саме ту базу, до якої підключений застосунок.
5. `cd backend && npm run build` — без помилок типів.

## Файли

- `backend/src/app.ts`
- `backend/src/server.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Сервер стартує і працює без MongoDB: немає fail-fast, health-check і логування стану зʼєднання»
- «Сервер стартує і живе без БД: помилка connect лише логується, немає обробки розривів і graceful shutdown»
- «Немає graceful shutdown і глобальних обробників помилок процесу»
