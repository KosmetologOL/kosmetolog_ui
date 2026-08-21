# E11 · Видалити мертвий код: admin.service, utils/generateTokens, cookieOptions, одрук «contoller», зайві поля валідатора HomeCare

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P2** | S (до пів дня) | Бекенд і експлуатація | E2 |

## Контекст

У бекенді накопичився мертвий код, який дублює живий і вже розійшовся з ним — класична пастка для майбутніх правок. services/admin.service.ts (161 рядок) не імпортується жодним файлом і дублює doctors/registrationRequests/categories-сервіси, причому його копії вже відстали від живих (не знають про showNameInReport/reportPosition). utils/generateTokens.ts теж не імпортується ніде і небезпечний: підписує access-токен без role (на якому тримається requireRoles) через process.env.JWT_SECRET! — security-фікс у цій копії пройшов би непоміченим. auth.service.login повертає cookieOptions, які auth.controller повністю ігнорує і задає власні. Файл specialist.contoller.ts має одрук у назві (ламає glob/grep по *.controller.ts) і експорти в минулому часі. Валідатор довідника HomeCare приймає поля medicationName/recommendations, яких немає в моделі HomeCare — Mongoose у strict-режимі мовчки їх відкидає (вони належать report-рівневій підсхемі).

## Кроки реалізації

1. `git rm backend/src/services/admin.service.ts` та `git rm backend/src/utils/generateTokens.ts` — grep по backend/src підтверджує: жодного імпорту обох файлів.
2. backend/src/services/auth.service.ts: видалити блок cookieOptions (рядки 89–94) і ключ `cookieOptions,` з return (рядок 99) — опції cookie задає auth.controller.ts:33–39, і саме він лишається єдиним джерелом.
3. `git mv backend/src/controllers/specialist.contoller.ts backend/src/controllers/specialist.controller.ts`; у backend/src/routes/specialist.routes.ts:2 виправити шлях імпорту на "../controllers/specialist.controller".
4. У перейменованому specialist.controller.ts перейменувати експорти createdSpecialist/updatedSpecialist/deletedSpecialist → createSpecialist/updateSpecialist/deleteSpecialist (рядки 8–10) і оновити три використання в specialist.routes.ts (рядки 21, 28, 34).
5. backend/src/validators/homeCare.validation.ts: видалити рядки 9–10 (medicationName і recommendations) з homeCareSchema — це безпечно: validate-мідлвара працює зі stripUnknown: true, тож клієнти, які ще надсилають ці поля, просто отримають їх відкинутими (як Mongoose і робив). Report-рівневу підсхему homeCareItemSchema у report.validation.ts:27–28 НЕ чіпати.
6. Рефакторинг homeCareController на createReferenceController свідомо НЕ робити — у нього реальні відмінності (reorder, search-параметр), а catch-блоки вже виправлені в тікеті E2.
7. `cd backend && npm run build` — tsc підтвердить відсутність посилань на видалене.

## Критерії приймання

- [x] Файли admin.service.ts і utils/generateTokens.ts відсутні в репозиторії; grep по backend/src не знаходить посилань на них.
- [x] Логін, refresh і logout працюють як раніше: cookie refreshToken ставиться при вході і чиститься при виході.
- [ ] У backend/src/controllers/ всі контролери відповідають шаблону *.controller.ts (без одруків); роути /specialists працюють повністю (список, пошук, create/update/delete).
- [x] POST і PUT /home-cares приймають name/morning/evening як раніше; зайві поля не потрапляють у валідатор.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. `cd backend && npm run build` без помилок; `grep -rn "admin.service\|utils/generateTokens" backend/src` → нуль збігів.
2. npm run dev; пройти логін → logout → логін на фронтенді; лишити вкладку до протухання access-токена і виконати дію — тихий refresh працює.
3. В адмінці спеціалістів: пошук, створення, редагування, видалення тестового запису — все працює.
4. В адмінці доглядів: створити і відредагувати тестовий запис (name/morning/evening) → зберігається; тестові записи прибрати.

## Файли

- `backend/src/services/admin.service.ts`
- `backend/src/utils/generateTokens.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/controllers/specialist.contoller.ts`
- `backend/src/routes/specialist.routes.ts`
- `backend/src/validators/homeCare.validation.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «admin.service.ts — 161 рядок мертвого коду, що дублює три живі сервіси»
- «Мертвий admin.service.ts дублює живі сервіси і створює ризик дрейфу»
- «Мертвий utils/generateTokens.ts з небезпечним process.env.JWT_SECRET!»
- «Мертвий дублікат security-коду, що може розійтися з робочим»
- «Одрук у назві файлу: specialist.contoller.ts»
- «HomeCare: бespoke-контролер повз factory, а валідатор приймає поля, яких немає в моделі»
