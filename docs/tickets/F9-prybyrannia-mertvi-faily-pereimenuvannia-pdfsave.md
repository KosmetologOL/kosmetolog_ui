# F9 · Прибирання: мертві файли, перейменування pdfSaveLocation, дедублікація verifyDirectoryPermission, зайві devDependencies

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P2** | S (до пів дня) | Фронтенд і UX | — |

## Контекст

Накопичився мертвий код і залишки старих пайплайнів. src/router/index.ts (масив routes) ніде не імпортується — і саме він єдиний тримає живим legacy-барел src/pages/index.ts (AppRouter робить lazy-імпорти напряму); src/App.css — файл на 0 байтів; src/assets/green.json (85 КБ) — залишок старої Lottie-анімації без жодної згадки в коді. Модуль збереження handle папки звітів досі зветься pdfSaveLocation.ts, хоча PDF-пайплайна давно немає, а функція verifyDirectoryPermission продубльована дослівно тричі (pdfSaveLocation, htmlSaveLocation, docxCardLink — тіла ідентичні, відрізняється лише тип параметра). У package.json висять autoprefixer і postcss, які не беруть участі в збірці (Tailwind 4 підключено через @tailwindcss/vite, конфігурації PostCSS немає), і baseline-browser-mapping — транзитивна залежність browserslist, закріплена напряму без видимої причини.

## Кроки реалізації

1. Перевірити відсутність зовнішніх посилань (grep по src/ на "router/index", "pages/index", "App.css", "green.json" — єдиний імпорт pages/index сидить у router/index.ts:1) і видалити чотири файли: frontend/src/router/index.ts, frontend/src/pages/index.ts, frontend/src/App.css, frontend/src/assets/green.json.
2. Перейменувати frontend/src/lib/pdfSaveLocation.ts → frontend/src/lib/reportsSaveLocation.ts (git mv) і оновити два імпорти: frontend/src/components/ReportForm/CreateReportForm.tsx:54 (`#lib/pdfSaveLocation` → `#lib/reportsSaveLocation`) та frontend/src/lib/htmlSaveLocation.ts:1–4 (`./pdfSaveLocation` → `./reportsSaveLocation`).
3. У reportsSaveLocation.ts замінити приватну verifyDirectoryPermission (рядки 51–61) на експортовану узагальнену функцію (queryPermission/requestPermission оголошені на базовому FileSystemHandle у src/types/fileSystemAccess.d.ts:10–18, тож один тип параметра покриває і папки, і файли):
```ts
export const verifyReadwritePermission = async (
  handle: FileSystemHandle,
): Promise<boolean> => {
  const descriptor = { mode: "readwrite" as const };
  if ((await handle.queryPermission(descriptor)) === "granted") return true;
  try {
    return (await handle.requestPermission(descriptor)) === "granted";
  } catch {
    return false;
  }
};
```
4. Видалити дублікати: verifyDirectoryPermission у htmlSaveLocation.ts:17–27 і verifyDocxFilePermission у docxCardLink.ts:5–15; в обох файлах імпортувати verifyReadwritePermission із ./reportsSaveLocation і замінити виклики (перевірити grep-ом, чи verifyDocxFilePermission не імпортується деінде — за потреби оновити і ті місця).
5. frontend/package.json: видалити з devDependencies `autoprefixer` (рядок 34) і `postcss` (рядок 40); щодо `baseline-browser-mapping` (рядок 35) — перевірити git log/blame, чи закріплення свідоме; якщо причини немає — видалити теж. Виконати `npm install`, щоб оновити package-lock.json.
6. Оновити CLAUDE.md: прибрати згадки про legacy-барел pages/index.ts (розділ «Frontend structure» і «Pages are lazy-loaded») і про мертвий App.css (розділ «Styling»); згадку pdfSaveLocation у переліку runtime-утиліт замінити на reportsSaveLocation.

## Критерії приймання

- [ ] Файли router/index.ts, pages/index.ts, App.css, assets/green.json відсутні в репозиторії; grep по src/ не знаходить посилань на них.
- [ ] Модуль зветься reportsSaveLocation.ts; grep не знаходить «pdfSaveLocation» ніде в проєкті (включно з CLAUDE.md).
- [ ] Функція перевірки readwrite-дозволу існує в одному місці; verifyDirectoryPermission/verifyDocxFilePermission-дублікатів немає.
- [ ] autoprefixer і postcss відсутні в package.json і package-lock.json.
- [ ] `npm run build` і `npm run lint` у frontend/ проходять; збірка Tailwind не зламалась (стилі на місці в dev і в preview).

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. `cd frontend && npm install && npm run build && npm run lint` — без помилок.
2. `npm run preview` — відкрити застосунок: стилі (кнопки, картки, кольори бренду) виглядають як у dev — отже видалення postcss/autoprefixer нічого не зачепило.
3. У Chrome: експорт HTML листа у вибрану папку (перший раз — вибір папки, другий — тихе збереження в неї) і «Додати в картку .docx» — обидва флоу з дозволами працюють, тобто спільна verifyReadwritePermission коректна для папок і файлів.
4. Перевірити, що застосунок стартує і маршрути / та /login працюють (видалений router/index.ts ні на що не впливав).

## Файли

- `frontend/src/router/index.ts`
- `frontend/src/pages/index.ts`
- `frontend/src/App.css`
- `frontend/src/assets/green.json`
- `frontend/src/lib/pdfSaveLocation.ts`
- `frontend/src/lib/htmlSaveLocation.ts`
- `frontend/src/lib/docxCardLink.ts`
- `frontend/src/components/ReportForm/CreateReportForm.tsx`
- `frontend/package.json`
- `CLAUDE.md`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Мертвий код: router/index.ts → pages/index.ts, порожній App.css, невикористаний green.json»
- «pdfSaveLocation.ts: застаріла назва і потрійне дублювання verifyDirectoryPermission»
- «Невикористані devDependencies: autoprefixer і postcss»
