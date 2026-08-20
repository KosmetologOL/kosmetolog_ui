# B3 · Report.patient: unique-індекс, 409 на другий лист, getLastVisitMap через агрегацію

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Шлях збереження листа | B2 |

## Контекст

Поле patient у ReportSchema (рядок 116) не має ані індексу, ані unique-обмеження. Наслідки три: (1) API дозволяє створити другий звіт для того самого пацієнта (Report.create без перевірки), після чого findOne у getByPatientId повертає недетермінований із двох — дані роздвоюються; (2) кожне відкриття листа і кожна сторінка/пошук списку пацієнтів роблять повний скан колекції звітів (findOne({patient}) та $in-вибірка в getLastVisitMap); (3) getLastVisitMap будує Map, де при дублях перемагає останній у природному порядку документ, а не максимальний updatedAt — «останній візит» може показувати застарілу дату. Фронтендовий тригер створення дубля закривається тікетом B2, цей тікет — захист на рівні БД/API плюс продуктивність. УВАГА: бекапів БД немає, тому перед додаванням unique-індексу обовʼязкова read-only перевірка на наявні дублікати.

## Кроки реалізації

1. ПЕРЕД деплоєм: read-only перевірка цільової БД на дублікати (нічого не видаляти і не зливати!):
```js
db.reports.aggregate([
  { $group: { _id: "$patient", n: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { n: { $gt: 1 } } },
])
```
Якщо результат непорожній — зупинитися й ескалювати власнику даних: будь-яке злиття/видалення лише з явним підтвердженням (бекапів немає). З дублікатами unique-індекс не збудується.
2. У backend/src/models/ReportSchema.ts після закриття схеми (рядок 156, перед `export default mongoose.model<IReport>("Report", ReportSchema);` на рядку 158) додати:
```ts
ReportSchema.index({ patient: 1 }, { unique: true });
```
Індекс створиться автоматично при старті бекенда — руками в БД нічого не робити.
3. У backend/src/utils/ApiError.ts додати статичний хелпер:
```ts
  static conflict(msg: string) {
    return new ApiError(409, msg);
  }
```
4. У backend/src/controllers/reports.controller.ts у create (catch, рядки 14–17) перед `next(ApiError.internal(…))` обробити порушення унікальності (duplicate key):
```ts
    if ((err as { code?: number })?.code === 11000) {
      return next(
        ApiError.conflict(
          "Лист для цього пацієнта вже існує. Оновіть сторінку, щоб редагувати наявний лист.",
        ),
      );
    }
```
5. У backend/src/services/reports.service.ts переписати getLastVisitMap (рядки 128–137) на агрегацію. Важливо: на відміну від find, aggregate НЕ кастить рядки до ObjectId — конвертувати вручну:
```ts
export const getLastVisitMap = async (
  patientIds: (string | mongoose.Types.ObjectId)[],
): Promise<Map<string, Date>> => {
  const ids = patientIds.map((id) =>
    typeof id === "string" ? new mongoose.Types.ObjectId(id) : id,
  );

  const rows = await Report.aggregate<{
    _id: mongoose.Types.ObjectId;
    lastVisit: Date;
  }>([
    { $match: { patient: { $in: ids } } },
    { $group: { _id: "$patient", lastVisit: { $max: "$updatedAt" } } },
  ]);

  return new Map(rows.map((r) => [r._id.toString(), r.lastVisit]));
};
```
6. У backend/src/controllers/patient.controller.ts додати `.lean()` у кінець ланцюжка запиту пацієнтів (рядки 22–25): `.limit(limit).lean()`, і на рядку 31 замінити `...p.toObject()` на `...p`.
7. Виконати `npm run build` у backend/.

## Критерії приймання

- [ ] У колекції reports існує unique-індекс { patient: 1 }; у логах старту бекенда немає помилки створення індексу.
- [ ] Повторний POST /reports із тим самим patient повертає 409 з українським повідомленням; другий документ не створюється.
- [ ] «Останній візит» у списку пацієнтів дорівнює максимальному updatedAt звіту пацієнта.
- [ ] Список пацієнтів (пагінація, пошук) і відкриття листа працюють без змін у поведінці.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. На локальній/dev-базі (перевірити MONGODB_URI!): запустити бекенд, у mongosh виконати db.reports.getIndexes() — має бути patient_1 з unique: true.
2. Створити тестового пацієнта і зберегти лист через UI; потім повторити POST вручну: `curl -X POST $API/reports -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"patient":"<id>"}'` — очікується 409 і незмінний count у db.reports (read-only перевірка).
3. Відкрити список пацієнтів: колонка останнього візиту для тестового пацієнта показує дату останнього збереження листа; пошук і пагінація працюють.
4. Read-only перевірку на дублікати з кроку 1 виконати і на dev-базі перед тестами, і на цільовій БД перед релізом.

## Файли

- `backend/src/models/ReportSchema.ts`
- `backend/src/utils/ApiError.ts`
- `backend/src/controllers/reports.controller.ts`
- `backend/src/services/reports.service.ts`
- `backend/src/controllers/patient.controller.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Немає unique-індексу на Report.patient — можливі звіти-дублікати з недетермінованим вибором»
- «Немає індексу на Report.patient — повний скан колекції звітів на кожне відкриття списку пацієнтів»
