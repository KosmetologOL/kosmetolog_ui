# A2 · Додати запобіжники в seed.ts: тільки локальна БД, явне підтвердження, лічильники перед видаленням, виправлений dotenv-шлях

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P0** | S (до пів дня) | Безпека даних | — |

## Контекст

Команда `npm run seed` (backend/package.json:9) запускає backend/src/seed.ts, який одразу виконує Promise.all із deleteMany({}) для шести колекцій — Exam, Procedure, Medication, Specialist, Patient, HomeCare (рядки 25–32) — без підтвердження, без перевірки середовища і без dry-run. Колекція reports при цьому не чиститься (модель Report навіть не імпортована), тож після сідування лишаються звіти-сироти. Єдине, що сьогодні рятує продакшн-базу (бекапів якої не існує), — випадково зламаний шлях dotenv на рядку 11: `dotenv.config({ path: "./src/config/.env" })` вказує на неіснуючий файл (у backend/src/config/ лежить лише env.ts, реальний .env — у корені backend/), тому скрипт падає на перевірці MONGODB_URI. Але достатньо комусь «полагодити» шлях або мати MONGODB_URI у shell — і один запуск безповоротно знищить усіх пацієнтів. Потрібен спроєктований захист замість випадкового.

## Кроки реалізації

1. У backend/src/seed.ts:11 видалити рядок `dotenv.config({ path: "./src/config/.env" });`, прибрати `import dotenv from "dotenv";` (рядок 1) і додати першим імпортом `import "dotenv/config";` — так само, як у src/server.ts:1 (npm run seed виконується з cwd = backend/, тож підхопиться backend/.env). УВАГА: цей фікс прибирає випадковий захист, тому виконується тільки в одному коміті разом із кроками 2–3.
2. Після наявної перевірки `if (!MONGODB_URI) {...}` (рядки 15–18) додати два запобіжники (готовий код):
```ts
const isLocalUri = /localhost|127\.0\.0\.1/.test(MONGODB_URI);
if (process.env.NODE_ENV === "production" || !isLocalUri) {
  console.error(
    "Сідер видаляє всі дані і працює лише з локальною базою (localhost/127.0.0.1). Запуск проти віддаленого URI заборонено.",
  );
  process.exit(1);
}
if (process.env.SEED_CONFIRM !== "yes") {
  console.error(
    "Сідер повністю перезаписує колекції. Для підтвердження запустіть: SEED_CONFIRM=yes npm run seed",
  );
  process.exit(1);
}
```
3. Додати імпорт `import Report from "./models/ReportSchema";` (модель існує, default-експорт у backend/src/models/ReportSchema.ts:158) і додати `Report.deleteMany({}),` у Promise.all (рядки 25–32) — інакше після пересіювання Patient лишаються звіти-сироти, що посилаються на видалених пацієнтів. Patient у сідері лишаємо: після guard-а з кроку 2 скрипт фізично не може торкнутися нелокальної бази, тож вимога висновків (захист живих пацієнтів на проді) виконана.
4. Усередині seed(), після `await mongoose.connect(MONGODB_URI);` (рядок 22) і перед Promise.all з deleteMany, вивести, що саме буде видалено:
```ts
console.log(`База: ${mongoose.connection.host}/${mongoose.connection.name}`);
for (const model of [Exam, Procedure, Medication, Specialist, Patient, HomeCare, Report]) {
  console.log(`${model.modelName}: буде видалено ${await model.countDocuments()} документів`);
}
```

## Критерії приймання

- [ ] Запуск npm run seed із будь-яким нелокальним MONGODB_URI (зокрема mongodb+srv://…mongodb.net) завершується помилкою і кодом 1 ще ДО підключення до бази.
- [ ] Запуск без SEED_CONFIRM=yes не виконує жодної операції запису і друкує підказку з правильною командою.
- [ ] Перед видаленням у консоль виводяться host/назва бази та кількість документів кожної колекції, яку буде очищено.
- [ ] Після успішного сідування локальної бази колекція reports порожня (немає звітів-сиріт).
- [ ] seed.ts більше не посилається на неіснуючий src/config/.env і читає той самий backend/.env, що й server.ts.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально, без ризику для прод-БД (guard спрацьовує до connect): `cd backend && MONGODB_URI="mongodb+srv://user:pass@fake.mongodb.net/db" SEED_CONFIRM=yes npm run seed` → відмова «лише з локальною базою», exit code 1.
2. `cd backend && npm run seed` (URI підтягнеться з реального backend/.env, який вказує на Atlas) → скрипт тепер БАЧИТЬ URI (немає помилки «Missing MONGODB_URI» — dotenv-фікс працює) і відмовляється, бо URI не локальний.
3. Підняти локальний mongod (docker run -d -p 27017:27017 mongo:7). `MONGODB_URI="mongodb://127.0.0.1:27017/kosmetology_dev" npm run seed` без SEED_CONFIRM → відмова з підказкою.
4. `SEED_CONFIRM=yes MONGODB_URI="mongodb://127.0.0.1:27017/kosmetology_dev" npm run seed` → друкуються host і лічильники по 7 колекціях, сідування завершується успішно.
5. `NODE_ENV=production SEED_CONFIRM=yes MONGODB_URI="mongodb://127.0.0.1:27017/kosmetology_dev" npm run seed` → відмова (перевірка NODE_ENV).
6. `cd backend && npm run build` — компіляція без помилок.

## Файли

- `backend/src/seed.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «[critical/S] seed.ts безумовно видаляє 6 колекцій без жодного запобіжника (БД без бекапів)»
- «[high/S] npm run seed безумовно видаляє всіх пацієнтів і довідники без підтвердження»
- «[medium/S] npm run seed безумовно стирає всю базу (включно з пацієнтами) без бекапів»
