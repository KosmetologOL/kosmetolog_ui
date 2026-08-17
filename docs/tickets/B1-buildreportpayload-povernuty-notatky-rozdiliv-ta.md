# B1 · buildReportPayload: повернути нотатки розділів та кількість відвідувань у збережуваний лист

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P0** | S (до пів дня) | Шлях збереження листа | — |

## Контекст

При збереженні рекомендаційного листа фронтенд надсилає поля medicationsNote/homeCareNote/examsNote/proceduresNote (нотатки «Важливо» до розділів) та visitCountEnabled/visitCount для процедур етапів. Joi-валідатор ці поля приймає (report.validation.ts:86–89 і 48–49), Mongoose-схема їх має (ReportSchema.ts:149–152 і 136–137), але функція buildReportPayload на бекенді їх НЕ включає в документ — і create(), і update() будують запис саме з неї, тож поля мовчки губляться. Лікар бачить тост «Лист збережено.», а після перезавантаження нотатки відкочуються до глобальних текстів із Settings (втрату маскує фолбек reportData?.medicationsNote ?? settingsData.medicationsNote у CreateReportForm.tsx:180–189), а прапорець і число «кількість відвідувань» скидаються. Це тиха втрата клінічних даних, що відбувається просто зараз при кожному збереженні.

## Кроки реалізації

1. У файлі backend/src/services/reports.service.ts у buildReportPayload після рядка 111 (`comments: data.comments?.trim() || "",`) додати чотири поля за тим самим зразком, що additionalInfo/finalNote:
```ts
  medicationsNote: data.medicationsNote?.trim() || "",
  homeCareNote: data.homeCareNote?.trim() || "",
  examsNote: data.examsNote?.trim() || "",
  proceduresNote: data.proceduresNote?.trim() || "",
```
2. Там само в normalizeProcedureStages у мапінгу процедур після рядка 73 (`interval: procedure.interval?.trim() || "",`) додати:
```ts
      visitCountEnabled: Boolean(procedure.visitCountEnabled),
      visitCount: procedure.visitCount ?? null,
```
3. Виконати `npm run build` у backend/ — переконатися, що tsc проходить без помилок.

## Критерії приймання

- [ ] POST /reports і PUT /reports/:id зберігають у документі звіту поля medicationsNote, homeCareNote, examsNote, proceduresNote саме з тіла запиту.
- [ ] Для кожної процедури етапу зберігаються visitCountEnabled і visitCount.
- [ ] Після перезавантаження форми листа нотатка «Важливо» показує текст, збережений у листі, а не глобальний текст із Settings.
- [ ] Увімкнена «кількість відвідувань» із числом не скидається після збереження і перезавантаження.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Переконатися, що backend/.env → MONGODB_URI вказує на локальну/dev-базу; запустити `npm run dev` у backend/ і frontend/.
2. Створити тестового пацієнта, відкрити його лист, у розділі «Обстеження» в полі «Важливо» ввести унікальний текст (відмінний від глобального в Settings), у процедурі етапу ввімкнути кількість відвідувань і ввести число.
3. Натиснути «Зберегти лист», перезавантажити сторінку (F5): текст «Важливо» і кількість відвідувань мають лишитися.
4. Read-only перевірка в mongosh: db.reports.findOne({ patient: ObjectId("<id тестового пацієнта>") }) — поля medicationsNote/…/proceduresNote і visitCountEnabled/visitCount присутні з правильними значеннями.

## Файли

- `backend/src/services/reports.service.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Тиха втрата даних: buildReportPayload відкидає medicationsNote/homeCareNote/examsNote/proceduresNote»
- «Мовчазна втрата даних листа: нотатки розділів і кількість відвідувань відкидаються бекендом»
