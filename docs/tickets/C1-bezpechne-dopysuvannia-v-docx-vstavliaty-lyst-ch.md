# C1 · Безпечне дописування в .docx: вставляти лист через DOM замість текстового пошуку <w:sectPr>

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P0** | M (1–2 дні) | Експорт: HTML і DOCX | — |

## Контекст

Функція «Додати в картку (.docx)» дописує рекомендаційний лист у Word-файл картки пацієнта: розпаковує архів через jszip, вставляє XML-параграфи у word/document.xml і перезаписує оригінальний файл на диску. Точку вставки зараз шукає insertParagraphsBeforeFinalSectPr (frontend/src/components/ReportForm/docx/spliceDocumentXml.ts) текстовим регексом — «останнє входження <w:sectPr». Це ламається у двох реальних випадках: (1) документ стороннього генератора може взагалі не мати body-рівневого <w:sectPr> (за ECMA-376 він необовʼязковий), і вставка потрапить усередину параграфа; (2) якщо у документі є tracked changes властивостей секції, всередині body-рівневого sectPr зʼявляється вкладений <w:sectPrChange><w:sectPr>…</w:sectPrChange> — він текстово стоїть пізніше, регекс матчить саме його, і параграфи вставляються ВСЕРЕДИНУ sectPr. В обох випадках виходить невалідний document.xml, який appendReportToDocx.ts одразу записує поверх оригінального файлу (createWritable → write → close) без перевірки. Файл картки пацієнта псується, бекапів у клієнта немає. Потрібно шукати точку вставки через DOM (sectPr саме як пряму дитину w:body), а не рядковим пошуком.

## Кроки реалізації

1. У frontend/src/components/ReportForm/docx/spliceDocumentXml.ts видалити регекс-константи SECT_PR_OPEN_RE, BODY_OPEN_RE, BODY_CLOSE_TAG (рядки 8-11) та хибний коментар про «останнє текстове входження» (рядки 13-15). Клас DocxStructureError (рядки 1-6) залишити без змін.
2. Додати константу неймспейсу: const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"; та хелпер parseXml(xml: string): Document — new DOMParser().parseFromString(xml, "application/xml"); якщо doc.getElementsByTagName("parsererror").length > 0 — кинути new DocxStructureError("word/document.xml не вдалося розпарсити як XML.").
3. Переписати insertParagraphsBeforeFinalSectPr(documentXml, paragraphsXml) на DOM: (а) const doc = parseXml(documentXml); (б) const body = doc.getElementsByTagNameNS(W_NS, "body")[0]; якщо body відсутній — кинути DocxStructureError("word/document.xml не містить очікуваної структури <w:body>.") (повідомлення вже є в коді, рядки 21-23); (в) фрагмент параграфів використовує лише префікс w:, тож парсити його з обгорткою: const fragmentDoc = parseXml(`<w:fragment xmlns:w="${W_NS}">${paragraphsXml}</w:fragment>`); (г) шукати sectPr ЛИШЕ серед прямих дітей body: const sectPr = Array.from(body.children).find((el) => el.namespaceURI === W_NS && el.localName === "sectPr") ?? null; — вкладені sectPr у w:pPr чи w:sectPrChange так не матчаться; (д) вставити всі вузли фрагмента: Array.from(fragmentDoc.documentElement.childNodes).forEach((node) => { body.insertBefore(doc.importNode(node, true), sectPr); }); — при sectPr === null insertBefore працює як appendChild, тобто кейс «без body-рівневого sectPr» покрито; (е) серіалізувати: const serialized = new XMLSerializer().serializeToString(doc);
4. XMLSerializer у браузері не відтворює XML-декларацію — зберегти оригінальну: const declaration = documentXml.match(/^<\?xml[^>]*\?>\s*/)?.[0] ?? ""; return serialized.startsWith("<?xml") ? serialized : declaration + serialized;
5. У frontend/src/components/ReportForm/docx/appendReportToDocx.ts змін не потрібно, але переконатися, що порядок зберігся: insertParagraphsBeforeFinalSectPr (рядки 61-64) викликається ДО zip.file/createWritable (рядки 65, 72), а DocxStructureError ловиться у catch (рядки 79-85) з українським тостом — тобто якщо сплайсинг кинув, файл на диску не змінюється.
6. Прогнати npm run lint і npm run build у frontend/.

## Критерії приймання

- [ ] insertParagraphsBeforeFinalSectPr не містить рядкового пошуку <w:sectPr — точка вставки визначається через DOM як пряма дитина w:body.
- [ ] Документ із <w:sectPrChange> усередині фінального sectPr після дописування відкривається у Word/LibreOffice без діалогу відновлення, і лист стоїть перед sectPr, а не всередині нього.
- [ ] Документ без body-рівневого <w:sectPr> після дописування валідний — лист вставлено у кінець body.
- [ ] Некоректний (необроблюваний парсером) document.xml призводить до тосту про помилку структури, а файл на диску лишається байт-у-байт незмінним.
- [ ] Результуючий document.xml починається з оригінальної XML-декларації <?xml …?>.
- [ ] npm run build і npm run lint проходять без помилок.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Запустити backend і frontend локально (npm run dev у кожній папці), увійти, відкрити форму листа тестового пацієнта (створити нового тестового пацієнта, не чіпати реальних).
2. Створити звичайний .docx (Word/LibreOffice/експорт із Google Docs) у окремій тестовій папці, натиснути «Додати в картку (.docx)», вибрати його — файл відкривається без «відновлення», лист дописано в кінець.
3. Кейс sectPrChange: скопіювати тестовий .docx, розпакувати (unzip file.docx -d dir), у word/document.xml всередину фінального <w:sectPr>…</w:sectPr> вставити <w:sectPrChange w:id="1" w:author="t" w:date="2026-01-01T00:00:00Z"><w:sectPr/></w:sectPrChange>, запакувати назад (cd dir && zip -r ../test-sectprchange.docx .). Дописати лист у цей файл — відкривається без помилок, лист стоїть перед фінальною секцією.
4. Кейс без sectPr: у ще одній копії видалити з document.xml фінальний <w:sectPr>…</w:sectPr>, запакувати, дописати лист — файл валідний, лист у кінці.
5. Негативний кейс: у копії обрізати document.xml посередині тега, запакувати. Зафіксувати md5 файлу (md5 test.docx), спробувати дописати — зʼявляється тост «Не вдалося розпізнати структуру .docx файлу…», md5 не змінився.
6. Усі перевірки — лише на тестових .docx у тестовій папці; реальні картки пацієнтів не чіпати.

## Файли

- `frontend/src/components/ReportForm/docx/spliceDocumentXml.ts`
- `frontend/src/components/ReportForm/docx/appendReportToDocx.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «[high/M] appendReportToDocx перезаписує картку пацієнта без валідації результату сплайсингу XML»
