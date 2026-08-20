# C10 · Динамічний імпорт коду експорту (generateReportHtml, appendReportToDocx, jszip)

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P2** | S (до пів дня) | Експорт: HTML і DOCX | C2, C5 |

## Контекст

generateReportHtml.ts (~940 рядків) і appendReportToDocx разом із бібліотекою jszip (єдиний її споживач) статично імпортуються у CreateReportForm.tsx і PatientItem.tsx, тому потрапляють у чанки сторінок форми листа та списку пацієнтів і вантажаться при кожному відкритті цих сторінок — хоча потрібні лише в момент натискання кнопки експорту. Сторінки вже lazy-loaded у AppRouter, але код експорту «приклеєний» до них. Перехід на динамічний import() у хендлерах змусить Vite виділити окремі чанки автоматично; поведінка не зміниться — обидва хендлери вже async зі станами isExportingHtml/isAppendingToDocx, тож пауза на довантаження чанка накрита наявним спінером.

## Кроки реалізації

1. У frontend/src/components/ReportForm/CreateReportForm.tsx видалити статичні імпорти appendReportToDocx і generateReportHtml (рядки 38-39).
2. У handleExportHtml перед викликом (зараз рядок 514) додати: const { generateReportHtml } = await import("#components/ReportForm/html/generateReportHtml"); у handleAppendToDocx перед викликом (зараз рядок 553): const { appendReportToDocx } = await import("#components/ReportForm/docx/appendReportToDocx");
3. У frontend/src/components/PatientList/PatientItem.tsx те саме: видалити статичні імпорти (рядки 5-6) і додати динамічні у handleExportHtml та handleAppendToDocx перед відповідними викликами.
4. Type-only імпорти залишити статичними (import type { GenerateReportHtmlParams } … у reportToExportParams.ts та інших місцях) — вони стираються при компіляції і чанк не тягнуть.
5. Зібрати npm run build і переглянути dist/assets: мають зʼявитися окремі чанки для generateReportHtml і appendReportToDocx (jszip усередині другого або окремим вендор-чанком), а чанки сторінок CreateReportPage/списку пацієнтів — схуднути.
6. Прогнати npm run lint.

## Критерії приймання

- [ ] У продакшн-збірці jszip і generateReportHtml лежать в окремих чанках, які не входять до початкових чанків сторінок форми листа і списку пацієнтів.
- [ ] Чанки експорту довантажуються лише при першому натисканні відповідної кнопки (видно у Network), повторні кліки не вантажать їх знову.
- [ ] Експорт HTML і дописування в .docx працюють як раніше з обох місць (форма листа і список пацієнтів).
- [ ] npm run build і npm run lint проходять без помилок.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. npm run build у frontend/, потім npm run preview; відкрити застосунок.
2. DevTools → Network (JS): відкрити список пацієнтів і форму листа — чанки з generateReportHtml/jszip НЕ вантажаться.
3. Натиснути «Створити HTML» — у Network зʼявляється чанк експорту, файл генерується, тости працюють; натиснути «Додати в картку (.docx)» на тестовому .docx — чанк із jszip довантажується, лист дописано.
4. Повторити експорт зі списку пацієнтів — обидві кнопки працюють.

## Файли

- `frontend/src/components/ReportForm/CreateReportForm.tsx`
- `frontend/src/components/PatientList/PatientItem.tsx`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «[low/S] jszip і весь код експорту статично зашиті в чанк сторінки рекомендаційного листа»
