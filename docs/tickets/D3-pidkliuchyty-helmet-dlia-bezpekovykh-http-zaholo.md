# D3 · Підключити helmet для безпекових HTTP-заголовків

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | S (до пів дня) | Автентифікація і безпека | — |

## Контекст

Ланцюжок middleware у backend/src/app.ts:12–20 складається лише з cors, cookieParser та express.json/urlencoded — пакета helmet немає ні в коді, ні в backend/package.json. Через це API не віддає базові безпекові заголовки: X-Content-Type-Options: nosniff, Strict-Transport-Security (HSTS), X-Frame-Options, Referrer-Policy. Для чистого JSON-API ризик обмежений, але це дешевий захист у два рядки, особливо з огляду на те, що refresh-кука ставиться з secure: true (auth.controller.ts:35) і сервіс має працювати строго по HTTPS.

## Кроки реалізації

1. У теці backend/ виконати: npm i helmet
2. У backend/src/app.ts додати до імпортів: import helmet from "helmet";
3. Після рядка 10 («const app = express();»), першим middleware (перед app.use(cors…)), додати:
// CSP для чистого JSON-API не потрібна; решта заголовків (nosniff, HSTS, frameguard) — за замовчуванням
app.use(helmet({ contentSecurityPolicy: false }));
4. Якщо виконуєте разом із D2 — app.set("trust proxy", 1) і app.use(helmet(...)) сусідять на початку файлу, порядок між ними неважливий.

## Критерії приймання

- [ ] helmet присутній у dependencies backend/package.json і підключений першим middleware у app.ts
- [ ] Відповіді API містять X-Content-Type-Options: nosniff, Strict-Transport-Security та X-Frame-Options
- [ ] Заголовок Content-Security-Policy відсутній (вимкнено свідомо для JSON-API)
- [ ] Фронтенд працює без регресій: login, довідники, звіти — CORS-запити не блокуються

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально: npm run dev у backend/, потім curl -i http://localhost:5000/auth/refresh → у відповіді присутні X-Content-Type-Options: nosniff, Strict-Transport-Security, X-Frame-Options; Content-Security-Policy відсутній.
2. npm run build у backend/ — компіляція TypeScript проходить без помилок.
3. Запустити frontend (npm run dev) проти локального backend: увійти, відкрити список пацієнтів і будь-який довідник — все працює, у консолі браузера немає нових CORS/CORP-помилок.

## Файли

- `backend/src/app.ts`
- `backend/package.json`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Відсутні безпекові HTTP-заголовки (немає helmet)»
