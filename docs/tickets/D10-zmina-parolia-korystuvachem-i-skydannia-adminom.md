# D10 · Зміна пароля користувачем і скидання адміном (backlog)

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P2** | M (1–2 дні) | Автентифікація і безпека | D4 |

## Контекст

У застосунку взагалі немає механізму зміни чи скидання пароля: auth.routes.ts містить лише register/login/refresh/logout/me, doctors.routes.ts — лише список, деактивацію і видалення; жодного password-ендпоїнта в проєкті немає (перевірено grep-ом по routes/ і controllers/). Скомпрометований або забутий пароль сьогодні можна змінити тільки ручним редагуванням продової MongoDB — бази, яка не має бекапів, тож кожна така ручна операція є ризиком сама по собі. Email-розсилки в проєкті немає, тому «скидання через лист» не варіант: реалістична схема для клініки — користувач змінює пароль сам (знаючи старий), а забутий пароль скидає адмін, отримуючи тимчасовий пароль і передаючи його лікарю особисто. Після зміни пароля активні refresh-сесії користувача треба відкликати — тому тікет залежить від D4 (колекція RefreshSession).

## Кроки реалізації

1. backend/src/validators/auth.validation.ts: додати changePasswordSchema = Joi.object({ oldPassword: Joi.string().required(), newPassword: Joi.string().min(6).max(200).required() }) з .messages(commonMessages) із validators/common.ts (не плодити локальні message-обʼєкти).
2. backend/src/services/auth.service.ts: додати changePassword(userId, oldPassword, newPassword): знайти користувача (notFound якщо немає), await user.comparePassword(oldPassword) → при неспівпадінні ApiError.badRequest("Неправильний поточний пароль"); user.password = newPassword; await user.save() (pre-save-хук у UserSchema.ts:28–33 захешує сам); await RefreshSession.deleteMany({ userId }) — усі сесії відкликаються, користувач перелогінюється.
3. backend/src/routes/auth.routes.ts: router.post("/change-password", authMiddleware, validate(changePasswordSchema), changePassword-контролер) — доступно всім автентифікованим ролям; контролер за проєктним патерном try/catch → next(ApiError…).
4. Адмінське скидання: у doctors.service.ts додати resetPassword(id): згенерувати тимчасовий пароль crypto.randomBytes(9).toString("base64url"), присвоїти user.password, await user.save(), RefreshSession.deleteMany({ userId: id }), запис в ActivityLog (за зразком toggleUserActive), повернути tempPassword. Маршрут: у doctors.routes.ts router.post("/:id/reset-password", validateObjectIdParams("id"), контролер) — requireRoles("admin") вже застосовано через router.use на рядку 10. Відповідь { tempPassword } показується адміну один раз; передача лікарю — особисто.
5. Frontend (мінімум): 1) форма «Змінити пароль» (старий/новий пароль, inline-валідація за патерном D9, toast про успіх) — розмістити в наявному місці профілю/меню користувача; 2) в адмінському списку лікарів кнопка «Скинути пароль» через ConfirmModal (async + isLoading за конвенцією), після успіху — Modal з тимчасовим паролем і кнопкою копіювання. Нові API-обгортки — в #api/authApi.ts і #api (файл лікарів) за наявним стилем.
6. Усі нові повідомлення — українською; in-progress-лейбли за стандартом копірайту («Зберігаємо…»).

## Критерії приймання

- [ ] POST /auth/change-password з неправильним старим паролем → 400 «Неправильний поточний пароль»; з правильним → 200, пароль змінено, всі RefreshSession користувача видалені (старий refresh-токен → 403), вхід новим паролем працює
- [ ] POST /doctors/:id/reset-password доступний лише admin (doctor/user → 403), повертає тимчасовий пароль, яким можна увійти; всі сесії лікаря відкликано
- [ ] Пароль у БД зберігається як bcrypt-хеш (хешування через pre-save-хук, не вручну)
- [ ] Валідація нового пароля використовує commonMessages; усі тексти українською
- [ ] Скидання пароля фіксується в ActivityLog
- [ ] npm run build у backend/ і npm run lint у frontend/ проходять

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локальна тестова БД (як у D1), npm run dev. Увійти тестовим користувачем, зберегти accessToken і cookie.
2. curl -s -X POST http://localhost:5000/auth/change-password -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"oldPassword":"wrong","newPassword":"newsecret1"}' → 400 «Неправильний поточний пароль».
3. Те саме з правильним oldPassword → 200; GET /auth/refresh зі старою кукою → 403; login новим паролем → 200; у mongosh db.users.findOne(...).password починається з $2 (bcrypt).
4. Зробити другого користувача адміном у тестовій БД (mongosh updateOne role:"admin"), увійти ним: POST /doctors/:id/reset-password для тестового лікаря → 200 з tempPassword; login лікаря старим паролем → 400, tempPassword → 200. Той самий запит з токеном лікаря (не адміна) → 403.
5. UI: у формі «Змінити пароль» перевірити inline-помилки і toast успіху; в адмінці — ConfirmModal і показ тимчасового пароля.

## Файли

- `backend/src/validators/auth.validation.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/routes/auth.routes.ts`
- `backend/src/services/doctors.service.ts`
- `backend/src/controllers/doctors.controller.ts`
- `backend/src/routes/doctors.routes.ts`
- `frontend/src/api/authApi.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Немає механізму зміни чи скидання пароля»
