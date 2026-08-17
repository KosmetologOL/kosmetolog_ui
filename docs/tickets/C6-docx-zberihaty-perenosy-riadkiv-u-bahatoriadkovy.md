# C6 · DOCX: зберігати переноси рядків у багаторядкових полях

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | S (до пів дня) | Експорт: HTML і DOCX | — |

## Контекст

У DOCX-фрагменті листа поля additionalInfo, comments, finalNote та коментарі до процедур рендеряться одним run(text), тобто одним <w:t xml:space="preserve">. Літеральні символи \n усередині w:t Word показує як пробіли, а не переноси рядків — стандартний фінальний текст листа DEFAULT_FINAL_NOTE (CreateReportForm.tsx:81-82, дворядковий, з номером телефону) у картці пацієнта склеюється в один рядок. HTML-версія ті самі поля пропускає через plainTextToHtml із заміною \n на <br /> (generateReportHtml.ts:72-73), тож формати розходяться. Хелпер lineBreakRun() у buildDocxFragment.ts уже існує (рядок 48) і використовується для <br> у rich-тексті — треба застосувати його й до цих плоских полів.

## Кроки реалізації

1. У frontend/src/components/ReportForm/docx/buildDocxFragment.ts після lineBreakRun (рядок 48) додати хелпер:
const multilineRuns = (text: string): string =>
  text
    .split("\n")
    .map((line) => run(line))
    .join(lineBreakRun());
(run("") повертає "" — подвійний \n дає два послідовні <w:br/>, порожній рядок зберігається).
2. Замінити run(...) на multilineRuns(...) у чотирьох місцях: коментар процедури — рядок 356: parts.push(paragraph(multilineRuns(proc.comment.trim()))); additionalInfo — рядок 377: parts.push(paragraph(multilineRuns(additionalInfo.trim()))); comments — рядок 382: parts.push(paragraph(multilineRuns(comments.trim()))); finalNote — рядок 386: parts.push(paragraph(multilineRuns(finalNote.trim()))).
3. Прогнати npm run lint і npm run build у frontend/.

## Критерії приймання

- [x] Дворядковий DEFAULT_FINAL_NOTE у дописаному .docx відображається двома рядками (телефон на новому рядку), як у HTML-версії.
- [x] Багаторядкові «Все, що необхідно знати про ваш стан», «Додаткова інформація» і коментарі до процедур зберігають переноси рядків у Word.
- [x] Однорядкові значення цих полів рендеряться без змін (без зайвих розривів).
- [x] npm run build і npm run lint проходять без помилок.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально: у звіті тестового пацієнта заповнити «Додаткову інформацію» текстом на 3 рядки (включно з порожнім рядком посередині), лишити стандартний фінальний текст, додати коментар до процедури на 2 рядки.
2. Дописати лист у тестовий .docx, відкрити у Word або LibreOffice — усі переноси на місці, порожній рядок зберігся.
3. Експортувати той самий звіт у HTML — переноси в обох форматах збігаються.

## Файли

- `frontend/src/components/ReportForm/docx/buildDocxFragment.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «[medium/S] DOCX-експорт втрачає переноси рядків у багаторядкових текстах»
