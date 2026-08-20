# E2 · Привести auth/categories/doctors/homeCare/registrationRequests-контролери до канонічного ApiError

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Бекенд і експлуатація | — |

## Контекст

Пʼять контролерів не використовують канонічний для проєкту шаблон try/catch → next(ApiError...), а відповідають напряму res.status(400|403|500).json({ message: (err as Error).message }). Через це сирі англомовні повідомлення Mongo/Mongoose (E11000 duplicate key, CastError) течуть користувачу, внутрішні збої віддаються як 400 замість 500, а errorHandler — єдине місце форматування помилок — обходиться. Додатково: registrationRequests.controller.ts:30 відповідає англійським "Approved", а reports.controller.ts:62 — єдине місце у файлі з прямим res.status(404).json замість next(ApiError.notFound). Підхід: сервіси кидають ApiError з українським текстом для очікуваних бізнес-помилок, контролери пропускають ApiError далі, а все невідоме перетворюють на generic ApiError.internal.

## Кроки реалізації

1. backend/src/utils/ApiError.ts: після static notFound додати дві фабрики: `static unauthorized(msg: string) { return new ApiError(401, msg); }` та `static forbidden(msg: string) { return new ApiError(403, msg); }`.
2. backend/src/services/auth.service.ts (додати `import ApiError from "../utils/ApiError";`): рядок 32 → `throw ApiError.badRequest("Користувач вже існує")`; 59 → badRequest("Запит на реєстрацію очікує підтвердження"); 60 і 79 → badRequest("Неправильний email або пароль"); 63 → badRequest("Акаунт деактивовано") (статус 400 зберігаємо — так відповідає поточний контролер); 66–68 → badRequest("Забагато невдалих спроб входу. Спробуйте пізніше."); 114 → forbidden("Недійсний або прострочений refresh-токен") (403 — як зараз у контролері); 120 → notFound("Користувача не знайдено").
3. backend/src/services/categories.service.ts: рядок 17 → ApiError.badRequest("Категорія вже існує"); 46 і 56 → ApiError.notFound("Категорію не знайдено"); 98 і 112 → ApiError.notFound("Елемент не знайдено").
4. backend/src/services/doctors.service.ts: рядок 16 → ApiError.notFound("Користувача не знайдено"); 27 → ApiError.notFound("Лікаря не знайдено").
5. backend/src/services/registrationRequests.service.ts: рядок 18 → ApiError.badRequest("Користувач з таким email вже існує"); 23 → ApiError.badRequest("Запит на реєстрацію вже існує"); 42 → ApiError.notFound("Запит не знайдено").
6. У контролерах auth.controller.ts, categories.controller.ts, doctors.controller.ts, homeCareController.ts, registrationRequests.controller.ts: додати третій параметр `next: NextFunction` до кожного хендлера і замінити всі catch-блоки на уніфікований: `next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));` (плюс console.error(err) перед next — як у patient.controller.ts).
7. homeCareController.ts: 404-гілки (рядки 33–35 і 46–48) → `return next(ApiError.notFound("Домашній догляд не знайдено"));`.
8. registrationRequests.controller.ts:30: `message: "Approved"` → `message: "Підтверджено"`.
9. reports.controller.ts:62: `return res.status(404).json({ message: "Звіт не знайдено" });` → `return next(ApiError.notFound("Звіт не знайдено"));` (формат JSON-відповіді через errorHandler той самий — { message }).
10. auth.controller.ts:72: `res.status(401).json({ message: "Неавторизовано" })` → `next(ApiError.unauthorized("Неавторизовано"))`.

## Критерії приймання

- [x] Жоден із пʼяти контролерів не містить `(err as Error).message` у відповіді; всі помилки проходять через next() і errorHandler.
- [x] Статуси, на які вже спирається фронтенд, збережені: помилки логіну/реєстрації — 400, помилка refresh — 403 (interceptor у lib/sessionRefresh.ts реагує лише на 401 і не зачіпається).
- [x] Дубльований email/назва повертає українське повідомлення, а не сирий текст E11000; непередбачений збій повертає 500 «Помилка сервера», а не 400.
- [x] POST /registration-requests/:id/approve повертає message «Підтверджено».

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. `cd backend && npm run build` — без помилок типів.
2. npm run dev; логін з неправильним паролем → 400 {"message":"Неправильний email або пароль"}.
3. Створити категорію двічі з однаковою назвою → друга відповідь 400 «Категорія вже існує» (українською, не E11000).
4. PUT /categories/<валідний, але неіснуючий ObjectId> → 404 «Категорію не знайдено».
5. GET /reports/patient/<id тестового пацієнта без листа> → 404 {"message":"Звіт не знайдено"} — формат не змінився.
6. Пройти на фронтенді логін/логаут/refresh (лишити вкладку до протухання access-токена) — потік не зламався.

## Файли

- `backend/src/utils/ApiError.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/controllers/categories.controller.ts`
- `backend/src/controllers/doctors.controller.ts`
- `backend/src/controllers/homeCareController.ts`
- `backend/src/controllers/registrationRequests.controller.ts`
- `backend/src/controllers/reports.controller.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/services/categories.service.ts`
- `backend/src/services/doctors.service.ts`
- `backend/src/services/registrationRequests.service.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Пʼять контролерів обходять ApiError/errorHandler і віддають сирі англомовні err.message»
