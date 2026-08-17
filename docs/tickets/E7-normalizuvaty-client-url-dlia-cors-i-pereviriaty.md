# E7 · Нормалізувати CLIENT_URL для CORS і перевіряти VITE_API_URL на фронтенді

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | S (до пів дня) | Бекенд і експлуатація | — |

## Контекст

app.ts:14 задає CORS origin як `process.env.CLIENT_URL || "http://localhost:5173/"`. Пакет cors порівнює заголовок Origin точним рядковим збігом, а браузер ніколи не надсилає Origin з трейлінг-слешем — тож фолбек мертвий: без заданого CLIENT_URL навіть локальний фронтенд отримує CORS-помилки «без видимої причини». Той самий клас помилки тихо зламає продакшн, якщо хтось задасть CLIENT_URL зі слешем у кінці. Симетрична проблема на фронтенді: import.meta.env.VITE_API_URL використовується без жодної перевірки у 6 api-файлах — якщо змінна не задана на білді, всі запити мовчки летять на "undefined/auth" тощо. config/env.ts на бекенді валідує лише JWT_SECRET, JWT_REFRESH_SECRET і MONGODB_URI.

## Кроки реалізації

1. backend/src/config/env.ts: після рядка 11 додати: `export const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");` та `if (!process.env.CLIENT_URL) { console.warn("CLIENT_URL не задано — використовується http://localhost:5173"); }` — нормалізація прибирає трейлінг-слеш і з env-значення теж.
2. backend/src/app.ts: у рядку 5 імпортувати CLIENT_URL разом з MONGODB_URI з "./config/env" і замінити рядок 14 на `origin: CLIENT_URL,`.
3. Створити frontend/src/lib/config.ts: `export const API_URL: string = import.meta.env.VITE_API_URL; if (!API_URL) { throw new Error("VITE_API_URL не задано — перевірте frontend/.env"); }`
4. Замінити пряме читання import.meta.env.VITE_API_URL на `import { API_URL as BASE_URL } from "#lib/config";` у 6 файлах: frontend/src/api/authApi.ts:3, referenceApi.ts:3, createReferenceApi.ts:12, reportsApi.ts:68, patientsApi.ts:16, settingsApi.ts:10 — кожен файл далі будує свій шлях від BASE_URL (наприклад, `const API_URL = BASE_URL + "/auth";`).
5. Мертві cookieOptions у auth.service.login НЕ чіпати тут — вони видаляються в тікеті E11.

## Критерії приймання

- [ ] Без CLIENT_URL у backend/.env локальний фронтенд (http://localhost:5173) працює без CORS-помилок; у логах бекенда — попередження.
- [ ] CLIENT_URL, заданий зі слешем у кінці (наприклад, "https://example.com/"), не ламає CORS — значення нормалізується.
- [ ] Запуск фронтенду без VITE_API_URL падає одразу зі зрозумілою помилкою «VITE_API_URL не задано…», а не тихими запитами на undefined/…
- [ ] grep по frontend/src знаходить import.meta.env.VITE_API_URL лише в lib/config.ts.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Тимчасово закоментувати CLIENT_URL у backend/.env, перезапустити dev-сервер, відкрити фронтенд → логін і список пацієнтів працюють без CORS-помилок у консолі браузера; повернути змінну.
2. Тимчасово прибрати VITE_API_URL з frontend/.env, `npm run dev` → у консолі браузера помилка «VITE_API_URL не задано — перевірте frontend/.env»; повернути змінну.
3. `grep -rn "VITE_API_URL" frontend/src` → єдиний збіг у src/lib/config.ts.
4. `cd frontend && npm run lint && npm run build`; `cd backend && npm run build`.

## Файли

- `backend/src/config/env.ts`
- `backend/src/app.ts`
- `frontend/src/lib/config.ts`
- `frontend/src/api/authApi.ts`
- `frontend/src/api/referenceApi.ts`
- `frontend/src/api/createReferenceApi.ts`
- `frontend/src/api/reportsApi.ts`
- `frontend/src/api/patientsApi.ts`
- `frontend/src/api/settingsApi.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Прогалини у валідації env: CLIENT_URL з непрацюючим CORS-фолбеком, VITE_API_URL без перевірки»
- «CORS: дефолтний origin з трейлінг-слешем ніколи не збігається»
- «CORS-fallback з trailing slash ніколи не збігається з заголовком Origin»
