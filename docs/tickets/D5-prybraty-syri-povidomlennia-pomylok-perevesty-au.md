# D5 · Прибрати сирі повідомлення помилок: перевести auth/doctors/categories/registration-requests/home-cares на ApiError

> ## ⛔️ ЗАКРИТО ЯК ДУБЛІКАТ E2 — НЕ ВИКОНУВАТИ
>
> Порівняння списків «## Файли» показало **10 із 10 однакових файлів** з
> [E2](E2-pryvesty-auth-categories-doctors-homecare-regist.md), а кроки реалізації описують той самий рефактор.
> **E2 — надмножина**: додатково покриває `reports.controller.ts:62`, `auth.controller.ts:72`
> і `message: "Approved"` → «Підтверджено».
>
> Унікальна частина D5 — пре-чек існуючого email перед `User.collection.insertOne`
> у `approveRegistration` — виконується окремим тікетом
> [E3](E3-approveregistration-pereviriaty-isnuiuchyi-email.md).
>
> Issue [#54](https://github.com/KosmetologOL/kosmetolog_ui/issues/54) закрито 2026-08-17;
> залежність D7 перевішено на E2. Текст нижче лишено як історію.

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** ~~(дублікат E2)~~ | S (до пів дня) | Автентифікація і безпека | D4 |

## Контекст

Пʼять контролерів віддають клієнту сирий текст будь-якої помилки: усі catch-блоки в auth.controller.ts, doctors.controller.ts, categories.controller.ts, registrationRequests.controller.ts і homeCareController.ts роблять res.status(400|500).json({ message: (err as Error).message }) без фільтрації. Це ламає прийнятий у проєкті патерн (controllers → next(ApiError…) → errorHandler як єдина точка серіалізації, див. patient.controller.ts і reports.controller.ts) і створює реальний витік: approveRegistration пише користувача через User.collection.insertOne в обхід Mongoose (registrationRequests.service.ts:45), тож дублікат email при апруві поверне адміну сирий «E11000 duplicate key error…» з внутрішніми деталями БД. Треба, щоб відомі бізнес-помилки й далі доходили до користувача українською (LoginForm показує message із сервера), а все невідоме перетворювалось на узагальнене «Помилка сервера».

## Кроки реалізації

1. У backend/src/utils/ApiError.ts додати дві статики за зразком наявних: static unauthorized(msg: string) { return new ApiError(401, msg); } і static forbidden(msg: string) { return new ApiError(403, msg); }
2. У сервісах замінити throw new Error(«бізнес-текст») на ApiError (import ApiError from "../utils/ApiError"): auth.service.ts — «Користувач вже існує», «Запит на реєстрацію очікує підтвердження», «Неправильний email або пароль» (2 місця), «Акаунт деактивовано», «Забагато невдалих спроб входу…» → ApiError.badRequest; «Користувача не знайдено» (refresh і getCurrentUser) → ApiError.notFound; catch у refresh() → throw ApiError.forbidden("Недійсний або прострочений refresh-токен") (статус 403 зберігається, фронтовий інтерсептор на нього і розрахований).
3. registrationRequests.service.ts: «Користувач з таким email вже існує» (рядок 18), «Запит на реєстрацію вже існує» (23) → badRequest; «Запит не знайдено» (42) → notFound. У approveRegistration перед User.collection.insertOne додати пре-чек: const existingUser = await User.findOne({ email: request.email }); if (existingUser) throw ApiError.badRequest("Користувач з таким email вже існує"); — гонка E11000 після пре-чеку впаде в загальний 500 без сирого тексту.
4. doctors.service.ts: «Користувача не знайдено» (16), «Лікаря не знайдено» (27) → ApiError.notFound. categories.service.ts: «Категорія вже існує» (17) → badRequest; «Категорію не знайдено» (46, 56) і «Елемент не знайдено» (98, 112) → notFound.
5. У контролерах auth.controller.ts (catch на 17-19, 42-44, 54-56, 75-77 — нумерація до D4), doctors.controller.ts (8-10, 19-21, 28-30), categories.controller.ts (усі 8 catch: 8-10, 23-25, 40-42, 50-52, 60-62, 75-77, 90-92, 100-102), registrationRequests.controller.ts (15-17, 31-33), homeCareController.ts (15-17, 24-26, 37-39, 50-52, 60-62): додати next: NextFunction третім параметром і замінити тіло кожного catch на: next(err instanceof ApiError ? err : ApiError.internal("Помилка сервера"));
6. Ранні guard-відповіді (напр. «Email і пароль обов'язкові» в auth.controller.ts:7, «Неавторизовано» на 72, 404-и в homeCareController) за бажанням перевести на next(ApiError.badRequest/unauthorized/notFound(...)) для однорідності — головний критерій: жоден catch більше не віддає (err as Error).message.
7. Переконатися, що бізнес-тексти доходять до клієнта без змін: errorHandler (backend/src/middlewares/errorHandler.ts) серіалізує err.message як і раніше — фронтенд (LoginForm, тости) змін не потребує.

## Критерії приймання

- [ ] grep -rn '(err as Error).message' backend/src/controllers не знаходить жодного збігу
- [ ] Відомі бізнес-помилки повертають той самий український текст і той самий клас статусу, що й раніше (login-помилки — 400, refresh — 403)
- [ ] Невідома помилка сервісу повертає 500 {"message":"Помилка сервера"}, а стек/деталі видно лише в консолі сервера (errorHandler робить console.error)
- [ ] Апрув заявки на реєстрацію з email, який вже має користувача, повертає 400 «Користувач з таким email вже існує» — без «E11000…» у відповіді
- [ ] npm run build у backend/ проходить без помилок типів (нові сигнатури з NextFunction)

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локальна тестова БД, npm run dev. Бізнес-текст зберігся: curl -s -X POST http://localhost:5000/auth/login -H 'Content-Type: application/json' -d '{"email":"doc@test.local","password":"wrong1"}' → 400 «Неправильний email або пароль».
2. Сценарій E11000: 1) curl register з role "doctor" і email dup@test.local → створюється заявка; 2) curl register БЕЗ role з тим самим email → створюється користувач; 3) зробити собі адміна в тестовій БД (mongosh: db.users.updateOne({email:"doc@test.local"},{$set:{role:"admin"}})), увійти ним і POST /registration-requests/:id/approve (id заявки з GET /registration-requests) → 400 «Користувач з таким email вже існує», без E11000.
3. Невідома помилка: тимчасово додати throw new Error("boom") першим рядком у CategoriesService.listCategories → GET /categories повертає 500 «Помилка сервера», у консолі сервера видно boom; прибрати тимчасовий рядок.
4. Прогнати основні сторінки фронтенда локально (довідники, категорії, домашній догляд, адмінка лікарів) — успішні сценарії працюють, тости помилок показують український текст.

## Файли

- `backend/src/utils/ApiError.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/controllers/doctors.controller.ts`
- `backend/src/controllers/categories.controller.ts`
- `backend/src/controllers/registrationRequests.controller.ts`
- `backend/src/controllers/homeCareController.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/services/registrationRequests.service.ts`
- `backend/src/services/doctors.service.ts`
- `backend/src/services/categories.service.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Сирі повідомлення внутрішніх помилок повертаються клієнту»
