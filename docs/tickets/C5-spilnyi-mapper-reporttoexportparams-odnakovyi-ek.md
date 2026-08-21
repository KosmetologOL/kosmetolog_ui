# C5 · Спільний маппер reportToExportParams: однаковий експорт із форми листа і зі списку пацієнтів

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Експорт: HTML і DOCX | C2 |

## Контекст

> **Премиса звірена з `dev` = `c768497` (2026-08-21) — половина застаріла.** Номери рядків
> у тексті нижче зсунулися після C2/C3/C4/C7/C9/F3/B6; орієнтуйся на **назви символів**
> (`handleExportHtml`, `handleAppendToDocx`, `handleExportPdf`, `IReport`), а не на номери.

Той самий збережений звіт, експортований зі сторінки листа і зі списку пацієнтів, зараз виглядає по-різному. PatientItem.handleExportHtml і handleAppendToDocx не передають поля medicationsNote, homeCareNote, examsNote, proceduresNote, хоча вони є у збереженому звіті (IReport, reportsApi.ts) — блоки «Важливо» зникають з експорту, зробленого з реєстру. Параметри опціональні у GenerateReportHtmlParams, тож TypeScript не попереджає. Правильне рішення — один спільний маппер зі збереженого IReport у параметри експорту, який використовують обидва місця виклику.

**Що вже виправлено до старту цього тікета:** `normalizeProcedureStages` більше не відкидає поля етапу — хвиля **F3 (коміт `42c11a7`)** типізувала його через `IReportProcedure`/`IReportProcedureStage` з `#api/reportsApi` і прокидає `workWithEnabled`/`workWith`. Суфікс «— робота з …» працює і в HTML, і в DOCX. Тобто крок 2 нижче — no-op, а критерій приймання 2 виконаний ще до початку робіт; його завдання — не зламатися регресією.

**`medicationsNote` сьогодні інертний.** Тікет C7 вимкнув увесь розділ «Засоби» прапорцем `INCLUDE_MEDICATIONS_SECTION = false` (`ReportForm/reportSectionFlags.ts`), і разом із розділом вимикається його нотатка «Важливо». Поле в маппер передавати треба — воно запрацює, коли замовник підтвердить розділ, — але **прапорець НЕ вмикати**: це рішення замовника (issue #112). Критерій 1 засобів і не вимагає — він перелічує обстеження, домашній догляд і процедури.

## Кроки реалізації

1. Створити frontend/src/lib/reportToExportParams.ts: export const reportToExportParams = (report: IReport, patient: IPatient, doctorName: string): GenerateReportHtmlParams => ({ patient, exams: report.exams || [], medications: report.medications || [], procedures: report.procedures || [], procedureStages: normalizeProcedureStages(report), specialists: report.specialists || [], homeCares: report.homeCares || [], categoryItems: (report.categories || []).map((c) => ({ ...c, _id: c._id ?? "" })), additionalInfo: report.additionalInfo || "", comments: report.comments || "", finalNote: report.finalNote || "", medicationsNote: report.medicationsNote || "", homeCareNote: report.homeCareNote || "", examsNote: report.examsNote || "", proceduresNote: report.proceduresNote || "", doctorName }); — тип GenerateReportHtmlParams імпортувати через import type (не тягне рантайм-код).
2. ~~У frontend/src/lib/normalizeProcedureStages.ts замінити локальні типи…~~ — **ВИКРЕСЛЕНО: уже зроблено хвилею F3 (`42c11a7`)**. Файл уже імпортує `IReport`/`IReportProcedure`/`IReportProcedureStage` з `#api/reportsApi` і вже прокидає `workWithEnabled`/`workWith`. Нічого не міняти; лише переконатися, що маппер із кроку 1 не загубив ці поля.
3. У frontend/src/components/PatientList/PatientItem.tsx: у handleExportHtml замінити ручну збірку параметрів (рядки 78-91) на await generateReportHtml(reportToExportParams(report, patient, getReportCreatorName(report.editHistory) || user?.name || "")); аналогічно в handleAppendToDocx (рядки 105-118). Прибрати локальний normalizeCategoryItems (рядки 69-70) і зайві імпорти.
4. У frontend/src/components/ReportForm/CreateReportForm.tsx: у handleExportHtml замінити ручну збірку на { ...reportToExportParams(savedReport, patient, getReportCreatorName(savedReport.editHistory) || user?.name || ""), directoryHandle } — savedReport повертається з saveReport() і містить усі щойно збережені дані; аналогічно у handleAppendToDocx. (`?? []` не потрібен — getReportCreatorName приймає undefined.) Так форма і список експортують той самий звіт побудовно однаково.
   **4b. Третє місце ручної збірки — `handleExportPdf` у тому ж файлі.** Без нього критерій 4 недосяжний. Замінити так само: `{ ...reportToExportParams(savedReport, patient, …), directoryHandle }` — `generateReportPdf` приймає той самий `GenerateReportHtmlParams`. Сам `pdf/generateReportPdf.tsx` при цьому не змінюється.
   **Увага, свідома зміна поведінки:** експорт із форми піде не з живого стану форми, а з `savedReport`, тобто через бекендові нормалізатори (trim, порожні → ""). Найпомітніше — домашній догляд без назви засобу: форма зараз друкує «—», список друкує «Засіб»; після цього тікета форма теж друкуватиме «Засіб». Це і є те, що закриває критерій 3.
5. Прогнати npm run lint і npm run build у frontend/ та переконатися, що типи зійшлися (особливо procedureStages: результат normalizeProcedureStages має відповідати IProcedureStage з generateReportHtml.ts:20-34).
6. **C2 виконано** — `appendReportToDocx(params, handle)`, і обидва місця виклику вже мають цю форму. Зберегти її: замінюється ЛИШЕ обʼєкт `params`; другий аргумент `handle` і виклик `pickPatientDocxCard` **до першого `await`** не чіпати (транзієнтна активація Chrome живе ~5 с).

## Критерії приймання

- [ ] HTML- і DOCX-експорт зі списку пацієнтів містить блоки «Важливо» (нотатки до обстежень, домашнього догляду, процедур), якщо вони заповнені у збереженому звіті.
- [ ] Заголовок етапу процедур в експорті зі списку містить суфікс «— робота з …», якщо у збереженому етапі увімкнено workWith. *(Уже виконано в F3 `42c11a7` — перевірити, що не зламалося регресією.)*
- [ ] Той самий збережений звіт, експортований з форми листа і зі списку пацієнтів, дає ідентичний вміст HTML-файлу (за винятком дати генерації). **Порівнювати експорти під одним акаунтом:** для звіту з понад 50 правок запис `create` витісняється з `editHistory` (`$slice: -50` з B9), `getReportCreatorName` повертає "" і підпис падає на фолбек `user?.name` — тобто залежить від того, хто експортує (issue #130).
- [ ] Параметри експорту збираються в одному місці (reportToExportParams) — у PatientItem і CreateReportForm (**включно з handleExportPdf**) немає дубльованої ручної збірки полів.
- [ ] npm run build і npm run lint проходять без помилок.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально: у тестового пацієнта створити звіт із заповненими нотатками «Важливо» (обстеження, домашній догляд, процедури), етапом з увімкненим «робота з …» і зберегти.
2. Експортувати HTML з форми листа і зі списку пацієнтів; порівняти файли (diff або візуально) — блоки «Важливо» і «— робота з …» присутні в обох, вміст збігається.
3. Дописати лист у тестовий .docx зі списку пацієнтів — нотатки «Важливо» і «— робота з …» присутні у Word.
4. Перевірити, що в експорті з форми нічого не зникло порівняно з поведінкою до зміни (зони/інтервали/кількість візитів процедур на місці) і що текст лишився той самий із точністю до `trim`. Окремо перевірити домашній догляд із порожньою назвою засобу: форма раніше друкувала «—», тепер має друкувати «Засіб», як і список — це очікувана зміна, а не регрес.
5. Експортувати PDF із форми — переконатися, що після переходу на спільний маппер він не втратив полів.

## Файли

- `frontend/src/lib/reportToExportParams.ts`
- `frontend/src/lib/normalizeProcedureStages.ts`
- `frontend/src/components/PatientList/PatientItem.tsx`
- `frontend/src/components/ReportForm/CreateReportForm.tsx`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «[medium/S] Експорт із списку пацієнтів дає інший результат, ніж із форми листа: губляться нотатки «Важливо» і «робота з …»»
