# E1 · Видалити мертвий GET /reports і каскадно видаляти листи разом з пацієнтом

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P0** | M (1–2 дні) | Бекенд і експлуатація | — |

## Контекст

DELETE /patients/:id зараз видаляє лише документ пацієнта (PatientService.remove — це просто Patient.findByIdAndDelete), а його рекомендаційний лист назавжди лишається в колекції reports: DELETE-ендпойнта для звітів не існує, з UI сирота недосяжна, але містить медичні дані видаленої особи. Водночас роут GET /reports (reports.routes.ts:11) захищений лише authMiddleware без requireRoles і віддає ВСЮ колекцію звітів без пагінації та projection, разом з editHistory — будь-який автентифікований користувач (включно з самозареєстрованими, які за відомою прогалиною обходять підтвердження адміна) одним запитом отримує повні медичні дані всіх пацієнтів. Фронтенд цей ендпойнт взагалі не викликає: getAllReports у reportsApi.ts визначений, але grep по frontend/src не знаходить жодного використання. Тобто це мертвий код, що створює реальний privacy-ризик — видаляємо його і закриваємо каскад.

## Кроки реалізації

1. У backend/src/services/reports.service.ts видалити рядок 123 (`export const getAll = async () => Report.find();`) і на його місці додати: `export const removeByPatientId = async (patientId: string) => Report.deleteMany({ patient: patientId });`
2. У backend/src/controllers/reports.controller.ts видалити функцію getAll (рядки 20–32); імпорти не чіпати — ReportService далі використовується.
3. У backend/src/routes/reports.routes.ts видалити рядок 11: `router.get("/", ReportsController.getAll);`
4. У frontend/src/api/reportsApi.ts видалити функцію getAllReports (рядки 70–73); інтерфейси IReport тощо лишити — вони використовуються рештою функцій.
5. У backend/src/controllers/patient.controller.ts у deletePatient після рядка 98 (`if (!patient) return next(ApiError.notFound("Пацієнт не знайдено"));`) і перед `res.status(204).send()` додати: `await ReportService.removeByPatientId(req.params.id);` — ReportService уже імпортовано на рядку 3.
6. У getLastVisitMap (backend/src/services/reports.service.ts:131–134) додати `.lean()` до Report.find(...) — вибірка read-only і використовує лише поля patient/updatedAt.
7. Наявні листи-сироти: виконати read-only перевірку в mongosh і показати список власнику; видаляти ЛИШЕ після його явного підтвердження (бекапів БД немає): `db.reports.aggregate([{ $lookup: { from: "patients", localField: "patient", foreignField: "_id", as: "p" } }, { $match: { p: { $size: 0 } } }, { $project: { _id: 1, patient: 1, updatedAt: 1 } }])`

## Критерії приймання

- [x] GET /reports повертає 404 (роута не існує) для будь-якого автентифікованого користувача.
- [x] Після DELETE /patients/:id у колекції reports не лишається документів з patient, що дорівнює видаленому id.
- [x] Функція getAllReports відсутня у frontend/src; `npm run build` проходить і в backend/, і в frontend/.
- [x] Жодних автоматичних видалень наявних сиріт — лише список для власника і видалення після явного підтвердження.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Підняти backend локально (`cd backend && npm run dev`), залогінитися, через UI створити ТЕСТОВОГО пацієнта і його лист.
2. curl GET http://localhost:5000/reports з валідним Bearer-токеном → 404 від notFound-мідлвари.
3. Від імені admin видалити тестового пацієнта (DELETE /patients/:id), потім GET /reports/patient/:patientId → 404 «Звіт не знайдено»; у mongosh: `db.reports.countDocuments({ patient: ObjectId("<id>") })` → 0 (зачіпає лише щойно створені тестові дані).
4. `cd frontend && npm run lint && npm run build`.

## Файли

- `backend/src/services/reports.service.ts`
- `backend/src/controllers/reports.controller.ts`
- `backend/src/routes/reports.routes.ts`
- `backend/src/controllers/patient.controller.ts`
- `frontend/src/api/reportsApi.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Видалення пацієнта не каскадується: звіти лишаються сиротами назавжди»
- «Видалення пацієнта лишає його лист-сироту в базі назавжди»
- «GET /reports віддає всю колекцію звітів без пагінації, projection і .lean() — і фронтендом взагалі не використовується»
- «GET /reports віддає всю колекцію без пагінації; lean() не використовується ніде»
