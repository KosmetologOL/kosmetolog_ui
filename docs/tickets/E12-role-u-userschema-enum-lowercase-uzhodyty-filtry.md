# E12 · Role у UserSchema: enum + lowercase, узгодити фільтри лікарів з конвенцією нечутливості до регістру

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P2** | S (до пів дня) | Бекенд і експлуатація | E3 |

## Контекст

Конвенція проєкту — ролі порівнюються без урахування регістру (requireRoles на бекенді, PrivateRoute/AuthProvider на фронтенді). Але UserSchema.role — вільний рядок без enum і без lowercase, а doctors.service фільтрує точним збігом: User.find({ role: "doctor" }) і User.findOneAndDelete({ _id, role: "doctor" }). Користувач із role "Doctor" пройшов би requireRoles("doctor") і мав повний доступ лікаря, але в адмінці лікарів був би невидимим і невидаляємим. Практична ймовірність низька (реєстрація не задає верхній регістр), але першопричину дешево прибрати на рівні схеми — тоді точні збіги у doctors.service стають коректними за побудовою.

## Кроки реалізації

1. backend/src/models/UserSchema.ts:20 замінити на: `role: { type: String, enum: ["admin", "doctor", "user"], lowercase: true, default: "user" },` — сеттер lowercase у Mongoose виконується ДО валідації, тож "Doctor" нормалізується в "doctor" і проходить enum; невідомі ролі (наприклад, "boss") відхиляються ValidationError.
2. backend/src/services/registrationRequests.service.ts: у обʼєкті для User.collection.insertOne (рядок 48) замінити `role: request.role || "doctor",` на `role: (request.role || "doctor").toLowerCase(),` — сирий insertOne обходить сеттери схеми, тож нормалізація тут потрібна явно.
3. Read-only перевірка наявних документів у mongosh: `db.users.find({ role: { $nin: ["admin", "doctor", "user"] } }, { email: 1, role: 1 })` — очікується порожній результат. Якщо записи є — показати список власнику і виправляти ПО ОДНОМУ документу лише після його явного підтвердження (бекапів БД немає, жодних bulk-оновлень).
4. doctors.service.ts НЕ переписувати на $regex — після нормалізації схеми точний збіг role: "doctor" коректний.

## Критерії приймання

- [ ] Реєстрація з role у будь-якому регістрі ("USER", "Doctor") зберігає в БД значення в нижньому регістрі.
- [ ] Користувач, створений через підтвердження заявки, має role в нижньому регістрі.
- [ ] У БД немає користувачів з role поза ["admin", "doctor", "user"] (або наявні розбіжності зафіксовані і погоджені з власником).
- [ ] Адмінка лікарів показує і дозволяє видалити кожного користувача з роллю doctor.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально: POST /auth/register з {"role":"USER"} → у mongosh db.users.findOne за email показує role "user".
2. Створити заявку doctor і підтвердити її адміном → у створеного користувача role "doctor" (нижній регістр); GET /doctors показує його в списку.
3. Виконати read-only запит з кроку 3 на dev-базі → порожньо.
4. Тестові акаунти видалити через адмінку лікарів; `cd backend && npm run build`.

## Файли

- `backend/src/models/UserSchema.ts`
- `backend/src/services/registrationRequests.service.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «listDoctors/deleteDoctor фільтрують role точним збігом всупереч конвенції нечутливості до регістру»
