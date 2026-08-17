# E8 · Спостережуваність: pino-логування, Sentry і повноцінний ActivityLog з адмінським переглядом

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P2** | M (1–2 дні) | Бекенд і експлуатація | E1, E2, E4, E5 |

## Контекст

Єдине логування помилок у бекенді — console.error в errorHandler; немає ані request-логів, ані error-трекера, тож інциденти на проді виявляються лише зі слів користувачів. ActivityLog при цьому write-only: він пише CRUD категорій, реєстраційні запити й активацію лікарів, але НЕ пише видалення пацієнтів, створення/оновлення листів і видалення довідників; жодного роута для читання не існує — дані досяжні лише прямим доступом до БД. Колекція без TTL росте необмежено. Для застосунку з медичними даними аудит «хто/що/коли» і базове виявлення помилок — обовʼязкова гігієна. Тікет реалізує сценарій «аудит потрібен»; якщо власник вирішить інакше — альтернатива внизу.

## Кроки реалізації

1. Крок 0 (рішення): підтвердити з власником, що аудит-лог потрібен. Якщо НІ — замість кроків 4–6 видалити models/ActivityLog.ts і всі виклики ActivityLog.create (categories.service.ts, doctors.service.ts, registrationRequests.service.ts) окремим PR; кроки 1–3 виконуються в будь-якому разі.
2. `cd backend && npm i pino pino-http`; створити src/utils/logger.ts з інстансом pino: `import pino from "pino"; export const logger = pino({ level: process.env.LOG_LEVEL || "info" });`
3. app.ts: `app.use(pinoHttp({ logger }))` перед роутами; middlewares/errorHandler.ts: замінити console.error("Error:", err) на logger.error({ err }, "request error"). Додатково `npm i @sentry/node`: ініціалізація в server.ts лише якщо задано process.env.SENTRY_DSN; в errorHandler — Sentry.captureException(err) для статусів >= 500 (без DSN сервер працює як раніше).
4. Розширити аудит на критичні мутації: у patient.controller.ts deletePatient після успішного видалення — `await ActivityLog.create({ user: req.user?.id, action: "delete-patient", meta: { patientId: req.params.id, fullName: patient.fullName } });` (типізувати req як AuthenticatedRequest); у reports.controller.ts create/update — записи "create-report"/"update-report" з meta { reportId, patient }; у createReferenceController.ts — додати третій параметр `resourceName: string` до фабрики і в remove писати `ActivityLog.create({ action: `delete-${resourceName}`, meta: { id } })`, оновивши всі контролери-обгортки довідників (exams, medications, procedures, specialists).
5. Новий адмінський перегляд: routes/activityLog.routes.ts (router.use(authMiddleware); router.get("/", requireRoles("admin"), ...)) + controllers/activityLog.controller.ts з пагінацією page/limit за зразком getAllPatients, сортуванням { createdAt: -1 } і .lean(); зареєструвати `router.use("/activity-log", activityLogRoutes)` у routes/index.ts.
6. TTL-індекс у models/ActivityLog.ts перед mongoose.model: `ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });` — термін зберігання (пропозиція: 365 днів) ОБОВʼЯЗКОВО погодити з власником до мержа: TTL видаляє записи автоматично, а бекапів БД немає.

## Критерії приймання

- [ ] Кожен HTTP-запит залишає структурований pino-рядок; помилки 5xx потрапляють у Sentry при заданому SENTRY_DSN, а без DSN сервер працює без змін.
- [ ] Видалення пацієнта, створення/оновлення листа і видалення запису довідника створюють записи ActivityLog з user/action/meta.
- [ ] GET /activity-log доступний лише адміну (doctor/user отримують 403) і віддає пагінований список, відсортований від новіших до старіших.
- [ ] TTL-індекс створено з терміном, погодженим із власником; рішення зафіксоване в описі PR.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. npm run dev → у консолі pino-рядки на кожен запит (перевірити кількома GET).
2. Створити тестового пацієнта і лист, оновити лист, видалити пацієнта → GET /activity-log від імені адміна містить відповідні записи; той самий запит від імені лікаря → 403.
3. Тимчасово кинути throw у будь-якому контролері з SENTRY_DSN тестового проєкту → подія зʼявляється в Sentry; без DSN — сервер стартує і працює.
4. У mongosh: `db.activitylogs.getIndexes()` містить TTL-індекс по createdAt. `cd backend && npm run build`.

## Файли

- `backend/src/utils/logger.ts`
- `backend/src/app.ts`
- `backend/src/server.ts`
- `backend/src/middlewares/errorHandler.ts`
- `backend/src/models/ActivityLog.ts`
- `backend/src/controllers/patient.controller.ts`
- `backend/src/controllers/reports.controller.ts`
- `backend/src/controllers/createReferenceController.ts`
- `backend/src/controllers/activityLog.controller.ts`
- `backend/src/routes/activityLog.routes.ts`
- `backend/src/routes/index.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «ActivityLog — write-only: жодного читання, жодного ендпойнта, необмежене зростання»
- «Нульова спостережуваність: помилки лише в stdout, ActivityLog пише вибірково і його ніхто не читає»
