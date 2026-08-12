# E9 · Індекси і схеми: Patient timestamps та індекс createdAt, unique для Specialist/HomeCare, компаундний індекс CategoryItem

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P2** | S (до пів дня) | Бекенд і експлуатація | — |

## Контекст

getAllPatients на кожен запит списку виконує count + .sort({ createdAt: -1 }).skip().limit(), але PatientSchema не має жодного індексу — сортування означає in-memory sort усієї колекції на кожну сторінку і кожен дебаунснутий пошук. PatientSchema також веде createdAt вручну (default: Date.now) без { timestamps: true } — updatedAt немає взагалі, на відміну від решти моделей. Specialist.name і HomeCare.name не мають unique: true (усі інші довідники — Exam/Medication/Procedure/Category — мають), тож дублікати можливі. CategoryItem.category без індексу, хоча listCategoryItems фільтрує саме по ньому. Додатково read-шлях пацієнтів гідратує повні Mongoose-документи і одразу робить toObject() — подвійна робота, яку прибирає .lean().

## Кроки реалізації

1. backend/src/models/PatientSchema.ts: прибрати ручне поле createdAt (рядки 14–17), додати другий аргумент `{ timestamps: true }` до new Schema; в інтерфейс IPatient додати `updatedAt: Date;`. createdAt наявних документів збережеться — поле вже в БД.
2. Там само перед mongoose.model додати: `PatientSchema.index({ createdAt: -1 });`
3. backend/src/models/SpecialistSchema.ts:9 → `name: { type: String, required: true, unique: true },`; backend/src/models/HomeCareSchema.ts:11 → так само. ПЕРЕД мержем виконати read-only перевірку дублікатів у mongosh: `db.specialists.aggregate([{ $group: { _id: "$name", n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }])` і аналогічно для db.homecares. Якщо дублікати є — показати список власнику і прибрати їх ЧЕРЕЗ адмінку руками, жодних bulk-видалень (бекапів немає); інакше unique-індекс просто не збудується.
4. backend/src/models/CategoryItem.ts: перед mongoose.model додати `CategoryItemSchema.index({ category: 1, name: 1 }, { unique: true });` — попередньо той самий read-only аналіз дублів у межах категорії: `db.categoryitems.aggregate([{ $group: { _id: { c: "$category", n: "$name" }, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }])`.
5. backend/src/controllers/patient.controller.ts: у ланцюжку рядків 22–25 додати `.lean()` після `.limit(limit)` і в рядку 31 замінити `...p.toObject(),` на `...p,` (з lean документи вже plain-обʼєкти).
6. Після старту dev-сервера перевірити, що Mongoose autoIndex створив індекси без помилок у логах.

## Критерії приймання

- [ ] db.patients.getIndexes() містить { createdAt: -1 }; db.specialists і db.homecares — unique-індекс по name; db.categoryitems — унікальний компаундний { category: 1, name: 1 }.
- [ ] Створення спеціаліста/догляду з наявною назвою повертає помилку, а не другий запис.
- [ ] Нові пацієнти отримують createdAt і updatedAt автоматично; список пацієнтів працює як раніше (порядок за датою створення, lastVisitAt на місці).
- [ ] Жодного автоматичного видалення чи модифікації наявних дублікатів — лише список для власника.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. npm run dev у backend/, у mongosh перевірити getIndexes() чотирьох колекцій.
2. Створити тестового пацієнта через UI → у документа в mongosh є і createdAt, і updatedAt; список пацієнтів на фронтенді сортується і пагінується як раніше, пошук працює.
3. В адмінці спробувати створити спеціаліста з наявною назвою → помилка, дубля немає (тестові записи прибрати через UI).
4. `cd backend && npm run build`.

## Файли

- `backend/src/models/PatientSchema.ts`
- `backend/src/models/SpecialistSchema.ts`
- `backend/src/models/HomeCareSchema.ts`
- `backend/src/models/CategoryItem.ts`
- `backend/src/controllers/patient.controller.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Прогалини в індексах і схемах: сортування пацієнтів без індексу, Specialist/HomeCare без unique, Patient без timestamps»
- «Колекція Patient без індексів під сортування і пошук; два повних скани на кожен запит списку»
