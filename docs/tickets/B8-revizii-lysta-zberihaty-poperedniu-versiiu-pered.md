# B8 · Ревізії листа: зберігати попередню версію перед кожним оновленням

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Шлях збереження листа | B1 |

## Контекст

На пацієнта існує рівно один рекомендаційний лист, і update() на бекенді (reports.service.ts:139–164) повністю заміняє його вміст новим payload через findByIdAndUpdate. editHistory зберігає лише метадані (хто/коли, ReportSchema.ts:102–112) — самого попереднього вмісту ніде немає. Якщо лікар помилково (або через збій завантаження форми) збереже порожній чи частковий стан — попередня версія листа зникає назавжди, а бекапів БД у проєкту немає. Потрібен дешевий механізм ревізій: перед кожним оновленням зберігати знімок попереднього payload в окрему колекцію з обмеженням глибини (~20). Окрема колекція, а не editHistory, тому що editHistory цілком повертається клієнту в кожному GET і рендериться у формі — снапшоти роздули б відповіді API. Відновлення при інциденті — вручну з БД; UI не входить у цей тікет.

## Кроки реалізації

1. Створити backend/src/models/ReportRevisionSchema.ts: інтерфейс + схема з полями report (Schema.Types.ObjectId, ref "Report", required), payload (Schema.Types.Mixed, required), editedAt (Date, default Date.now), userId/email/name/role (String, default "") — за зразком EditHistorySubSchema; опція { timestamps: true }; перед створенням моделі додати `ReportRevisionSchema.index({ report: 1, createdAt: -1 });`; `export default mongoose.model("ReportRevision", ReportRevisionSchema);`.
2. У backend/src/services/reports.service.ts імпортувати ReportRevision і в update() після перевірки `if (!existing) { return null; }` (рядки 147–149) додати збереження знімка ПОПЕРЕДНЬОГО стану:
```ts
  await ReportRevision.create({
    report: existing._id,
    payload: buildReportPayload(existing),
    editedAt: new Date(),
    userId: actor?.id || "",
    email: actor?.email || "",
    name: actor?.name || "",
    role: actor?.role || "",
  });
```
3. Одразу після створення ревізії обмежити глибину історії до 20: `countDocuments({ report: existing._id })`; якщо більше 20 — вибрати найстаріші зайві (`.find({ report }).sort({ createdAt: 1 }).limit(n - 20).select("_id")`) і видалити їх deleteMany за списком _id. Це видалення торкається ЛИШЕ нової колекції reportrevisions, яку створює сам код, — колекції reports не чіпати.
4. Переконатися, що create() (перше збереження листа) ревізію НЕ створює — попередньої версії ще немає.
5. Виконати `npm run build` у backend/.

## Критерії приймання

- [ ] Кожен успішний PUT /reports/:id створює в колекції reportrevisions документ із повним payload попередньої версії листа (включно з нотатками розділів і visitCount — тому залежність від B1) та даними актора.
- [ ] Для одного звіту зберігається не більше 20 останніх ревізій; найстаріші видаляються автоматично.
- [ ] PUT для неіснуючого id повертає 404 і не створює ревізію.
- [ ] Відповіді наявних ендпоїнтів /reports (GET/POST/PUT) не змінилися за формою.
- [ ] Перше створення листа (POST) не створює ревізій.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. На локальній/dev-базі: зберегти лист тестового пацієнта, змінити вміст, зберегти ще раз; у mongosh (read-only) db.reportrevisions.find({ report: ObjectId("<reportId>") }) — одна ревізія, payload відповідає першій версії.
2. Зберегти лист ~25 разів (можна циклом curl PUT на dev-базі); перевірити db.reportrevisions.countDocuments({ report: ObjectId("<reportId>") }) === 20 і що лишилися найновіші (за editedAt).
3. PUT з вигаданим id → 404, кількість ревізій не змінилася.
4. Перевірити, що форма листа у браузері працює як раніше (збереження, історія редагувань).

## Файли

- `backend/src/models/ReportRevisionSchema.ts`
- `backend/src/services/reports.service.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Оновлення листа повністю затирає попередній вміст без версіонування»
