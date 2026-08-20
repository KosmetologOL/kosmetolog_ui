# D1 · Перевіряти active і lockUntil у /auth/refresh

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P0** | S (до пів дня) | Автентифікація і безпека | — |

## Контекст

Адмін деактивує лікаря через PATCH /doctors/:id/active, і login() це поважає: у backend/src/services/auth.service.ts:63 є перевірка «if (user.active === false) throw new Error("Акаунт деактивовано")». Але refresh() (auth.service.ts:104–116) перевіряє лише підпис refresh-JWT та існування користувача — прапорець active і блокування lockUntil ігноруються. Refresh-токен підписується на 7 днів (auth.service.ts:9–11), тож деактивований лікар ще до 7 діб продовжує отримувати нові 15-хвилинні access-токени і має повний доступ до пацієнтів та листів. Це фактично означає, що кнопка деактивації в адмінці не працює. Фікс — одна-дві перевірки за зразком login().

## Кроки реалізації

1. У backend/src/services/auth.service.ts у функції refresh() після рядка 108 («if (!user) throw new Error("Користувача не знайдено");») вставити готовий код:
2. if (user.active === false) throw new Error("Акаунт деактивовано");
3. if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
  throw new Error("Забагато невдалих спроб входу. Спробуйте пізніше.");
}
4. Більше нічого не міняти: зовнішній catch (рядки 113–115) свідомо замінить текст на «Недійсний або прострочений refresh-токен», контролер поверне 403 (backend/src/controllers/auth.controller.ts:54–56), а фронтовий інтерсептор (frontend/src/lib/sessionRefresh.ts:67–71) викличе onSessionExpired і розлогінить користувача — це очікувана поведінка.

## Критерії приймання

- [x] GET /auth/refresh для користувача з active === false повертає 403 з повідомленням «Недійсний або прострочений refresh-токен»
- [x] GET /auth/refresh для користувача з lockUntil у майбутньому повертає 403
- [x] Для активного користувача refresh працює як раніше (200 + новий accessToken)
- [x] Деактивований користувач у відкритій вкладці автоматично розлогінюється щонайпізніше при першому 401 після закінчення поточного access-токена (≤15 хв)

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. У backend/.env тимчасово вказати MONGODB_URI на локальну тестову базу (напр. mongodb://127.0.0.1:27017/kosmetolog_test) — НЕ використовувати продову базу і НЕ запускати npm run seed проти неї (seed робить deleteMany). Запустити npm run dev (порт за замовчуванням 5000).
2. Створити тестового користувача: curl -s -X POST http://localhost:5000/auth/register -H 'Content-Type: application/json' -d '{"email":"doc@test.local","password":"secret1"}' (роль user створюється одразу, без апруву).
3. Увійти зі збереженням cookie: curl -s -c cookies.txt -X POST http://localhost:5000/auth/login -H 'Content-Type: application/json' -d '{"email":"doc@test.local","password":"secret1"}' → переконатись, що refresh працює: curl -s -b cookies.txt http://localhost:5000/auth/refresh → 200 + accessToken.
4. У mongosh локальної тестової БД: db.users.updateOne({email:"doc@test.local"},{$set:{active:false}}) → повторити curl -s -i -b cookies.txt http://localhost:5000/auth/refresh → 403 «Недійсний або прострочений refresh-токен».
5. Перевірити lockUntil: db.users.updateOne({email:"doc@test.local"},{$set:{active:true,lockUntil:new Date(Date.now()+900000)}}) → refresh → 403; потім зняти lockUntil ($unset) → refresh знову 200.

## Файли

- `backend/src/services/auth.service.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Деактивація акаунта не діє: /auth/refresh ігнорує прапорець active»
- «Деактивований користувач зберігає доступ: refresh не перевіряє active»
