# F8 · Форма листа: адаптивні ширини контролів етапу, точковий дебаунс SearchHomeCare, дешевший перерахунок isDirty

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P2** | M (1–2 дні) | Фронтенд і UX | F4 |

## Контекст

Три дрібні, але відчутні проблеми форми рекомендаційного листа. (1) Контроли етапу процедур мають жорсткі ширини (селект «Робота з» — 320px flex-none, назва етапу — 220px, селекти зони/інтервалу — 160px): на екрані ~360px доступна ширина всередині stage-card ≈280–300px, тож контроли вилазять за межі і породжують горизонтальний скрол — єдине неадаптивне місце в застосунку. (2) У SearchHomeCare ефект пошуку залежить від усього обʼєкта searchValues: кожна літера в одному полі скасовує і перезапускає таймери ВСІХ категорій, повторно шле ідентичні запити для категорій, де текст не змінювався, і робить зайві setState для порожніх категорій. (3) currentSnapshot у CreateReportForm — JSON.stringify УСЬОГО стану форми в useMemo із залежностями на кожне поле: будь-яке натискання клавіші серіалізує повний лист лише щоб порахувати isDirty, що на великих листах дає мікрофризи вводу.

## Кроки реалізації

1. frontend/src/components/ReportForm/ProcedureStageCard.tsx — замінити фіксовані ширини на обмежені (на десктопі вигляд не зміниться): рядок 80 `"field-input h-9 w-[220px] flex-none"` → `"field-input h-9 max-w-[220px] min-w-0 flex-1"`; рядок 98 `"h-9 w-[320px] flex-none"` → `"h-9 w-full max-w-[320px] min-w-0 flex-1"`; рядки 190 і 227 `"h-9 w-[160px] flex-none"` → `"h-9 flex-1 min-w-[140px] max-w-[180px]"`; рядки 201 і 238 `"field-input h-9 w-[180px] flex-none"` → `"field-input h-9 flex-1 min-w-[140px] max-w-[180px]"`.
2. frontend/src/components/HomeCare/SearchHomeCare.tsx — винести вміст allHomeCares.map (рядки 124–341) в окремий компонент HomeCareCategoryCard (у цьому ж файлі) з пропсами { care, selectedHomeCares, setSelectedHomeCares, onEdit: (h: IHomeCare) => void }. Усередині картки — власні стани searchValue/results/isLoading/checkboxes і `const debouncedSearch = useDebouncedValue(searchValue, 400)` (хук уже є: #hooks/useDebouncedValue) + useEffect на [debouncedSearch] з ignore-прапорцем за зразком SearchPicker.tsx:43–60. Прибрати з батьківського компонента спільні стани searchValues/results/loading і масовий ефект (рядки 46–78) разом із handleSearchChange.
3. Логіку addHomeCare лишити в батьку (їй потрібен selectedHomeCares) або передати колбеком; редагування через ReferenceItemModal лишається на рівні батька (onEdit → setEditingHomeCare).
4. frontend/src/components/ReportForm/CreateReportForm.tsx (рядки 133–165) — деферити серіалізацію:
```ts
const snapshotSource = {
  selectedExams, selectedMedications, selectedSpecialists,
  selectedHomeCares, selectedCategoryItems, procedureStages,
  comments, additionalInfo, finalNote,
  medicationsNote, homeCareNote, examsNote, proceduresNote,
};
const deferredSource = useDeferredValue(snapshotSource);
const currentSnapshot = useMemo(
  () => JSON.stringify(deferredSource),
  [deferredSource],
);
```
(додати useDeferredValue до імпорту react). isDirty (рядок 167) і ефекти 286–290, beforeunload — без змін.
5. У saveReport замінити рядок 483 `setSavedSnapshot(currentSnapshot);` на `setSavedSnapshot(JSON.stringify(snapshotSource));` — щоб збережений знімок не відставав на один деферований рендер від щойно введеного тексту.

## Критерії приймання

- [ ] На вьюпорті 360px stage-card з усіма контролами (назва етапу, «Робота з», зона, інтервал, «Інше», кількість візитів) не породжує горизонтального скролу; на десктопі розкладка виглядає як раніше.
- [ ] Набір тексту в полі пошуку однієї категорії домашнього догляду НЕ шле повторних запитів searchMedicationsByName для інших категорій (перевіряється в Network).
- [ ] Дебаунс 400 мс на пошук у категорії зберігається; результати, спінер і чекбокси «Ранок/Вечір» працюють як раніше.
- [ ] Введення тексту у великому листі не серіалізує форму в блокуючому рендері (stringify іде в деферованому оновленні); індикатор незбережених змін і попередження при закритті працюють як раніше.
- [ ] Одразу після «Зберегти» isDirty стає false навіть якщо текст вводився безпосередньо перед збереженням.
- [ ] `npm run lint` у frontend/ чистий.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. DevTools → Device toolbar, 360×740: відкрити форму листа, додати етап і процедуру — жодного горизонтального скролу в stage-card; перевірити також 320px.
2. Network: у секції «Домашній догляд» знайти засіб у категорії А, потім друкувати в категорії Б — запити летять лише для Б.
3. Заповнити великий лист, друкувати у «Додаткова інформація» — ввід плавний; змінити поле, натиснути «Зберегти», переконатися, що закриття форми більше не питає про незбережені зміни.
4. Пройти повний флоу: додати/видалити засоби догляду, редагувати засіб олівцем, зберегти лист, перезавантажити — все на місці.

## Файли

- `frontend/src/components/ReportForm/ProcedureStageCard.tsx`
- `frontend/src/components/HomeCare/SearchHomeCare.tsx`
- `frontend/src/components/ReportForm/CreateReportForm.tsx`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Фіксовані ширини контролів етапу процедур ламають верстку на вузьких екранах»
- «SearchHomeCare: набір тексту в одній категорії перезапускає пошук у всіх»
- «SearchHomeCare перезапускає пошук для ВСІХ категорій на кожне натискання клавіші в одній»
- «JSON.stringify усього стану форми листа на кожне натискання клавіші»
