# C2 · Дописування в картку: пікер до збереження, розрізнення помилок, звірка з пацієнтом і резервна копія

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P0** | M (1–2 дні) | Експорт: HTML і DOCX | C1 |

## Контекст

У потоці «Додати в картку (.docx)» є три повʼязані проблеми. По-перше, у формі листа пікер файлу відкривається ПІСЛЯ await saveReport() (CreateReportForm.tsx:550-553): якщо збереження триває довше за вікно transient user activation Chrome (~5 с), showOpenFilePicker кидає SecurityError — лист збережено, пікер мовчки не зʼявився. По-друге, pickPatientDocxFile (docxCardLink.ts:19-42) загортає все в catch-all, що повертає null: скасування (AbortError), SecurityError і відмова в дозволі нерозрізненні, appendReportToDocx трактує null як «скасовано» без жодного повідомлення. По-третє, вибраний .docx ніяк не звіряється з поточним пацієнтом — misclick дописує лист Іваненко в картку Петренко, а оскільки jszip пересеріалізує весь архів і перезаписує файл, попередньої версії не лишається (бекапів у клієнта немає). HTML-експорт зроблено правильно — пікер папки викликається ДО збереження (CreateReportForm.tsx:509); DOCX-потік треба зробити дзеркально і додати страхувальні механізми.

## Кроки реалізації

1. У frontend/src/lib/docxCardLink.ts змінити pickPatientDocxFile (рядки 19-42): повертати обʼєкт-статус замість handle|null. Додати тип: export type PickDocxResult = { status: "picked"; handle: FileSystemFileHandle } | { status: "cancelled" } | { status: "picker-failed" } | { status: "permission-denied" }. У catch: якщо (err as DOMException)?.name === "AbortError" — повернути { status: "cancelled" }; інакше console.error(err) і { status: "picker-failed" }. Якщо verifyDocxFilePermission повернув false (рядок 38) — { status: "permission-denied" }.
2. Там само додати хелпер звірки: export const looksLikePatientCard = (fileName: string, fullName?: string): boolean — нормалізувати обидва рядки (toLowerCase, прибрати розширення .docx, замінити [_\-.]+ на пробіл, звести апострофи ʼ/'/' до одного, стиснути пробіли) і повернути true, якщо перше слово ПІБ (прізвище) входить у назву файлу; при порожньому fullName — true.
3. Там само додати обгортку з фідбеком: export const pickPatientDocxCard = async (patientFullName?: string): Promise<FileSystemFileHandle | null> — (а) якщо !isDocxLinkingSupported() → toast.error("Автоматичне додавання в картку доступне лише в Chrome або Edge.") і null (перенести цей тост із appendReportToDocx.ts:19-24); (б) викликати pickPatientDocxFile і за статусами: cancelled → мовчки null; picker-failed → toast.error("Не вдалося відкрити вибір файлу — спробуйте ще раз.") і null; permission-denied → toast.error("Немає дозволу на запис у файл картки.") і null; (в) якщо !looksLikePatientCard(handle.name, patientFullName) — window.confirm(`Вибраний файл «${handle.name}» не схожий на картку пацієнта «${patientFullName}». Все одно дописати лист у цей файл?`); при відмові — null (window.confirm тут доречний за конвенціями проєкту — синхронний блокувальний промпт). Імпортувати toast з "react-hot-toast" (у lib/ це вже практикується — див. globalErrorHandling.ts).
4. У frontend/src/components/ReportForm/docx/appendReportToDocx.ts змінити сигнатуру на appendReportToDocx(params: GenerateReportHtmlParams, handle: FileSystemFileHandle): прибрати блок isDocxLinkingSupported/pickPatientDocxFile (рядки 19-29) та імпорт із #lib/docxCardLink; спростити AppendDocxResult до { status: "appended" } | { status: "failed"; reason: "read-failed" | "invalid-structure" | "write-failed" } (повернене значення ніде не споживається — перевірено грепом).
5. Резервна копія: у frontend/src/lib/htmlSaveLocation.ts зробити downloadBlob (рядок 6) експортованим (export const downloadBlob = …). У appendReportToDocx.ts перед const writable = await handle.createWritable(); (рядок 72) додати: downloadBlob(`${handle.name}.bak`, file); — file це вже прочитаний оригінал (рядок 33), копія падає у «Завантаження» ДО перезапису. Оновити тост успіху (рядок 76): toast.success(`Звіт додано в кінець файлу «${handle.name}». Попередню версію збережено в «Завантаження» як «${handle.name}.bak».`);
6. У frontend/src/components/ReportForm/CreateReportForm.tsx переписати handleAppendToDocx (рядки 545-583): першим рядком (до setIsAppendingToDocx і до saveReport, дзеркально до handleExportHtml з ensureReportsDirectoryHandle на рядку 509) — const handle = await pickPatientDocxCard(patient.fullName); if (!handle) return; далі setIsAppendingToDocx(true) → savedReport = await saveReport() → await appendReportToDocx({…}, handle). Оновити імпорт (рядок 53): додати pickPatientDocxCard з #lib/docxCardLink.
7. У frontend/src/components/PatientList/PatientItem.tsx аналогічно у handleAppendToDocx (рядки 99-124): const handle = await pickPatientDocxCard(patient.fullName); if (!handle) return; до setIsAppendingToDocx і до await getReportByPatientId, потім await appendReportToDocx({…}, handle). Оновити імпорт із #lib/docxCardLink (рядок 13).
8. Прогнати npm run lint і npm run build у frontend/ — TypeScript підкаже, якщо десь лишився старий виклик без handle.

## Критерії приймання

- [x] Пікер файлу відкривається одразу після кліку «Додати в картку (.docx)», ДО збереження звіту — навіть якщо збереження триває понад 5 секунд, пікер не зникає мовчки.
- [x] Скасування пікера (Escape) не показує жодного повідомлення; збій відкриття пікера і відмова в дозволі показують різні українські тости.
- [x] Якщо назва вибраного файлу не містить прізвища пацієнта — зʼявляється підтвердження з назвою файлу та ПІБ пацієнта; відмова скасовує операцію без запису.
- [x] Перед кожним перезаписом картки у «Завантаження» падає копія попередньої версії з розширенням .bak, і тост успіху про це повідомляє.
- [x] У непідтримуваному браузері (Firefox/Safari) спроба дописування показує тост «…доступне лише в Chrome або Edge», як і раніше.
- [x] npm run build і npm run lint проходять без помилок.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально в Chrome: у формі листа тестового пацієнта натиснути «Додати в картку (.docx)» — пікер зʼявляється миттєво, до тосту «Лист збережено.». Вибрати тестовий .docx із прізвищем пацієнта в назві — лист дописано, у «Завантаженнях» зʼявився файл .bak, тост згадує резервну копію.
2. Відкрити .bak (перейменувавши у .docx) — це попередня версія картки без дописаного листа.
3. Натиснути кнопку і закрити пікер через Escape — жодних тостів, стан кнопки скинувся.
4. Вибрати тестовий файл з іншою назвою (наприклад «Тест_Інший_Пацієнт.docx») — зʼявляється confirm про розбіжність; «Скасувати» → файл не змінено (перевірити md5 до/після).
5. Симулювати відмову в дозволі: у Chrome → налаштування сайту → File editing → Block, повторити — тост «Немає дозволу на запис у файл картки.».
6. У Firefox переконатися, що кнопка у списку пацієнтів заблокована з підказкою, а у формі листа спроба показує тост про Chrome/Edge.
7. Усі перевірки на тестових пацієнтах і тестових .docx-файлах; реальні дані не мутувати.

## Файли

- `frontend/src/lib/docxCardLink.ts`
- `frontend/src/components/ReportForm/docx/appendReportToDocx.ts`
- `frontend/src/components/ReportForm/CreateReportForm.tsx`
- `frontend/src/components/PatientList/PatientItem.tsx`
- `frontend/src/lib/htmlSaveLocation.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «[medium/M] Дописування листа в .docx: можна вибрати картку не того пацієнта, резервної копії файлу немає»
- «[medium/S] «Додати в картку (.docx)»: скасування і збої нерозрізненні, а пікер може мовчки не відкритися після довгого збереження»
