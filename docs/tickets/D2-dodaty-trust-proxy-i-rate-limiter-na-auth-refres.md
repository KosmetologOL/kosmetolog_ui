# D2 · Додати trust proxy і rate-limiter на /auth/refresh

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | S (до пів дня) | Автентифікація і безпека | — |

## Контекст

Лімітери входу/реєстрації (backend/src/middlewares/rateLimiters.ts:3–17) рахують спроби за req.ip, але в app.ts немає app.set("trust proxy", …). За реверс-проксі (nginx/Cloudflare) це дає одну з двох проблем: якщо проксі передає заголовок X-Forwarded-For, express-rate-limit ^8.5.2 (версія з backend/package.json) кидає помилку валідації ERR_ERL_UNEXPECTED_X_FORWARDED_FOR і /auth/login та /auth/register відповідають 500; якщо заголовка немає — всі клієнти клініки рахуються за IP проксі та ділять спільний ліміт «10 спроб/15 хв» на всіх. Додатково GET /auth/refresh (backend/src/routes/auth.routes.ts:26) взагалі без лімітера, хоча це неавтентифікований ендпоїнт, який виконує запит до БД і криптографію на кожен виклик.

## Кроки реалізації

1. У backend/src/app.ts після рядка 10 («const app = express();») додати:
// За реверс-проксі (nginx/Cloudflare) довіряємо першому хопу,
// щоб req.ip був IP клієнта, а не проксі (потрібно для rate-limit).
// Якщо хопів більше — виставити фактичну кількість.
app.set("trust proxy", 1);
2. У backend/src/middlewares/rateLimiters.ts додати новий лімітер:
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Забагато запитів. Спробуйте пізніше." },
});
3. У backend/src/routes/auth.routes.ts додати refreshRateLimiter до імпорту з ../middlewares/rateLimiters (рядки 10–13) і змінити рядок 26 на: router.get("/refresh", refreshRateLimiter, refreshToken);

## Критерії приймання

- [x] Запит до /auth/login із заголовком X-Forwarded-For не повертає 500 і не пише помилку валідації express-rate-limit у консоль
- [x] Ліміт рахується за клієнтським IP: різні значення X-Forwarded-For мають незалежні лічильники
- [x] GET /auth/refresh обмежений 60 запитами за 15 хв з одного IP; понад ліміт — 429 з українським повідомленням
- [x] Наявні ліміти login (10/15 хв) і register (10/год) працюють як раніше

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально запустити backend (npm run dev, тестова БД). До фіксу: curl -i -H 'X-Forwarded-For: 1.2.3.4' -X POST http://localhost:5000/auth/login -H 'Content-Type: application/json' -d '{"email":"a@a.com","password":"x"}' → у консолі сервера помилка ERR_ERL_UNEXPECTED_X_FORWARDED_FOR; після фіксу — звичайна відповідь 400/401 без помилок у консолі.
2. Ліміт per-IP: у циклі 10 запитів з -H 'X-Forwarded-For: 1.2.3.4' → 11-й дає 429; одразу після цього запит з -H 'X-Forwarded-For: 5.6.7.8' → НЕ 429 (незалежний лічильник).
3. Лімітер refresh: for i in $(seq 1 61); do curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5000/auth/refresh; done → перші 60 відповідей 401 («Немає refresh-токена»), 61-ша — 429.
4. Після деплою на staging за реальним проксі: увійти з двох різних мереж і переконатися, що блокування одного клієнта не блокує іншого (нічого в БД не мутується).

## Файли

- `backend/src/app.ts`
- `backend/src/middlewares/rateLimiters.ts`
- `backend/src/routes/auth.routes.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Rate-limiter без trust proxy: за реверс-проксі ламається або дає спільний ліміт на всіх»
