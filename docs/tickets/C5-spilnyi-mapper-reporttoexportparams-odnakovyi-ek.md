# C5 · Спільний маппер reportToExportParams: однаковий експорт із форми листа і зі списку пацієнтів

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Експорт: HTML і DOCX | C2 |

## Контекст

Той самий збережений звіт, експортований зі сторінки листа і зі списку пацієнтів, зараз виглядає по-різному. PatientItem.handleExportHtml (рядки 72-97) і handleAppendToDocx (99-124) не передають поля medicationsNote, homeCareNote, examsNote, proceduresNote, хоча вони є у збереженому звіті (IReport, reportsApi.ts:59-62) — блоки «Важливо» зникають з експорту, зробленого з реєстру. Параметри опціональні у GenerateReportHtmlParams, тож TypeScript не попереджає. Додатково normalizeProcedureStages (lib/normalizeProcedureStages.ts) повертає лише title і procedures, відкидаючи workWithEnabled/workWith на рівні етапу — заголовок етапу втрачає суфікс «— робота з …» (поля процедур zone/interval/visitCount при цьому проходять на рантаймі через cast, але не типізовані). Правильне рішення — один спільний маппер зі збереженого IReport у параметри експорту, який використовують обидва місця виклику.

## Кроки реалізації

1. Створити frontend/src/lib/reportToExportParams.ts: export const reportToExportParams = (report: IReport, patient: IPatient, doctorName: string): GenerateReportHtmlParams => ({ patient, exams: report.exams || [], medications: report.medications || [], procedures: report.procedures || [], procedureStages: normalizeProcedureStages(report), specialists: report.specialists || [], homeCares: report.homeCares || [], categoryItems: (report.categories || []).map((c) => ({ ...c, _id: c._id ?? "" })), additionalInfo: report.additionalInfo || "", comments: report.comments || "", finalNote: report.finalNote || "", medicationsNote: report.medicationsNote || "", homeCareNote: report.homeCareNote || "", examsNote: report.examsNote || "", proceduresNote: report.proceduresNote || "", doctorName }); — тип GenerateReportHtmlParams імпортувати через import type (не тягне рантайм-код).
2. У frontend/src/lib/normalizeProcedureStages.ts: замінити локальні типи ReportProcedure/ReportProcedureStage на IReportProcedure та IReportProcedureStage з #api/reportsApi (там уже є zone/interval/visitCount/workWith, рядки 12-31 reportsApi.ts); у гілці procedureStages (рядки 25-30) прокидати поля етапу: { title: stage.stage, workWithEnabled: stage.workWithEnabled, workWith: stage.workWith, procedures: stage.procedures ?? [] }.
3. У frontend/src/components/PatientList/PatientItem.tsx: у handleExportHtml замінити ручну збірку параметрів (рядки 78-91) на await generateReportHtml(reportToExportParams(report, patient, getReportCreatorName(report.editHistory) || user?.name || "")); аналогічно в handleAppendToDocx (рядки 105-118). Прибрати локальний normalizeCategoryItems (рядки 69-70) і зайві імпорти.
4. У frontend/src/components/ReportForm/CreateReportForm.tsx: у handleExportHtml (рядки 514-535) замінити ручну збірку на { ...reportToExportParams(savedReport, patient, getReportCreatorName(savedReport.editHistory ?? []) || user?.name || ""), directoryHandle } — savedReport повертається з saveReport() і містить усі щойно збережені дані; аналогічно у handleAppendToDocx (рядки 553-573). Так форма і список експортують той самий звіт побудовно однаково.
5. Прогнати npm run lint і npm run build у frontend/ та переконатися, що типи зійшлися (особливо procedureStages: результат normalizeProcedureStages має відповідати IProcedureStage з generateReportHtml.ts:20-34).
6. Увага: якщо тікет C2 уже виконано, handleAppendToDocx приймає handle другим аргументом — зберегти цю сигнатуру.

## Критерії приймання

- [ ] HTML- і DOCX-експорт зі списку пацієнтів містить блоки «Важливо» (нотатки до обстежень, домашнього догляду, процедур), якщо вони заповнені у збереженому звіті.
- [ ] Заголовок етапу процедур в експорті зі списку містить суфікс «— робота з …», якщо у збереженому етапі увімкнено workWith.
- [ ] Той самий збережений звіт, експортований з форми листа і зі списку пацієнтів, дає ідентичний вміст HTML-файлу (за винятком дати генерації).
- [ ] Параметри експорту збираються в одному місці (reportToExportParams) — у PatientItem і CreateReportForm немає дубльованої ручної збірки полів.
- [ ] npm run build і npm run lint проходять без помилок.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально: у тестового пацієнта створити звіт із заповненими нотатками «Важливо» (обстеження, домашній догляд, процедури), етапом з увімкненим «робота з …» і зберегти.
2. Експортувати HTML з форми листа і зі списку пацієнтів; порівняти файли (diff або візуально) — блоки «Важливо» і «— робота з …» присутні в обох, вміст збігається.
3. Дописати лист у тестовий .docx зі списку пацієнтів — нотатки «Важливо» і «— робота з …» присутні у Word.
4. Перевірити, що в експорті з форми нічого не зникло порівняно з поведінкою до зміни (зони/інтервали/кількість візитів процедур на місці).

## Файли

- `frontend/src/lib/reportToExportParams.ts`
- `frontend/src/lib/normalizeProcedureStages.ts`
- `frontend/src/components/PatientList/PatientItem.tsx`
- `frontend/src/components/ReportForm/CreateReportForm.tsx`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «[medium/S] Експорт із списку пацієнтів дає інший результат, ніж із форми листа: губляться нотатки «Важливо» і «робота з …»»
