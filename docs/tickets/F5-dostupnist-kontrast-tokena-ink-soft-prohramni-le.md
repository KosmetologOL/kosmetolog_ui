# F5 · Доступність: контраст токена ink-soft, програмні лейбли полів, заголовки секцій, клавіатурний патерн табів

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Фронтенд і UX | — |

## Контекст

Три повʼязані прогалини доступності. (1) Токен --color-ink-soft #71735f дає контраст ≈4.38:1 на фоні paper і ≈4.14:1 на surface-2 — нижче порога WCAG AA 4.5:1, а саме цим кольором набрано дрібний текст: .chip-sub у чипах, .sub-label, лейбли «Ранок/Вечір» у stage-card. (2) У формі листа textarea не мають програмних назв: NoteField рендерить лейбл як <p> без htmlFor, «Додаткова інформація» і ще два великі поля тримаються лише на placeholder; заголовки секцій — <p class="section-label">, тож скрінрідер не може навігувати по заголовках (єдиний заголовок у формі — h1). (3) Таби довідників оголошені role="tab"/tablist з aria-selected, але без клавіатурного патерна: стрілки не працюють, roving tabindex немає, контент — звичайний div без role="tabpanel" — «пів-патерн» вводить користувачів скрінрідерів в оману. Правильні зразки вже в проєкті: SettingsManager (htmlFor+id).

## Кроки реалізації

1. frontend/src/index.css:44: замінити `--color-ink-soft: #71735f;` на `--color-ink-soft: #63654f;` (дає ≈5.10:1 на surface-2 і ≈5.39:1 на paper — AA проходить, відтінок лишається в оливковій гамі бренду).
2. frontend/src/components/ReportForm/NoteField.tsx: імпортувати useId; у компоненті `const id = useId();`; рядок 22 `<p className="sub-label">{label}</p>` → `<label htmlFor={id} className="sub-label">{label}</label>`; textarea (23–29) додати `id={id}`. (Компонент зараз — стрілочна функція з неявним поверненням — перетворити на тіло з return.)
3. frontend/src/components/ReportForm/ReportComments.tsx:11–16: додати textarea `aria-label="Додаткова інформація"`.
4. frontend/src/components/ReportForm/CreateReportForm.tsx: textarea на рядках 777–783 додати `aria-label="Все, що необхідно знати про ваш стан"`; textarea на 821–827 — `aria-label="Текст у кінці рекомендаційного листа"`.
5. frontend/src/components/ReportForm/ReportSection.tsx:14–19: `<p className="section-label mb-0!">` → `<h2 className="section-label mb-0!">` (стилі класові — вигляд не зміниться).
6. frontend/src/components/PatientList/PatientList.tsx:243–254: активній кнопці пагінації (гілка `item === page`, клас is-active) додати `aria-current="page"`.
7. frontend/src/pages/references/ReferencePanel.tsx — доімплементувати патерн табів: у renderTab (148–161) додати `id={`tab-${tab.key}`}`, `tabIndex={activeTab === tab.key ? 0 : -1}`, `aria-controls="reference-tabpanel"`; зібрати впорядкований список ключів `const allTabKeys = [...referenceTabs, ...(isCategoriesLoading ? [] : dynamicTabs), ...trailingTabs].map((t) => t.key);`; на div[role=tablist] (169–174) повісити onKeyDown:
```tsx
const handleTabKeyDown = (e: React.KeyboardEvent) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  const idx = Math.max(0, allTabKeys.indexOf(activeTab));
  const delta = e.key === "ArrowRight" ? 1 : -1;
  const next = allTabKeys[(idx + delta + allTabKeys.length) % allTabKeys.length];
  setActiveTab(next);
  document.getElementById(`tab-${next}`)?.focus();
};
```
диву .card (рядок 192) додати `role="tabpanel" id="reference-tabpanel" aria-labelledby={`tab-${activeTab}`}`.
8. Перевірити, що автопрокрутка табів (ReferencePanel.tsx:119–128, селектор '[aria-selected="true"]') далі працює — aria-selected зберігається.

## Критерії приймання

- [x] Контраст кольору ink-soft на фонах paper (#f4f3ee) і surface-2 (#eeede5) ≥ 4.5:1 (перевірено контраст-калькулятором).
- [x] Клік по лейблу NoteField фокусує його textarea; усі textarea форми листа мають accessible name у DevTools → Accessibility.
- [x] Заголовки секцій форми листа — елементи h2; у форми зʼявляється ієрархія заголовків h1 → h2.
- [x] У табах довідників: стрілки вліво/вправо перемикають таби по колу, Tab-ом фокус не ходить по всіх пілюлях (roving tabindex), контент має role="tabpanel" з aria-labelledby на активний таб.
- [x] Активна сторінка пагінації реєстру має aria-current="page".
- [x] Візуальний вигляд шапки, чипів, stage-card і секцій не зламався (лише трохи темніший другорядний текст).

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Перевірити пари #63654f/#f4f3ee і #63654f/#eeede5 у будь-якому WCAG-калькуляторі контрасту — обидві ≥ 4.5:1.
2. У dev: клікнути по лейблах «Важливо»/памʼяток у формі листа — фокус стрибає в textarea.
3. DevTools → Accessibility: у кожної textarea форми листа є Name.
4. Клавіатура на Довідниках: сфокусувати активний таб, стрілками пройтися по всіх табах (включно з динамічними категоріями), Tab — фокус іде в панель.
5. Прогнати axe DevTools або Lighthouse Accessibility на сторінках «Реєстр пацієнтів», «Довідники» і формі листа — немає помилок label/contrast/tab-семантики.
6. Візуально переглянути шапку, чипи вибраного, stage-card («Ранок/Вечір») після зміни токена.

## Файли

- `frontend/src/index.css`
- `frontend/src/components/ReportForm/NoteField.tsx`
- `frontend/src/components/ReportForm/ReportComments.tsx`
- `frontend/src/components/ReportForm/CreateReportForm.tsx`
- `frontend/src/components/ReportForm/ReportSection.tsx`
- `frontend/src/components/PatientList/PatientList.tsx`
- `frontend/src/pages/references/ReferencePanel.tsx`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Контраст --color-ink-soft #71735f нижчий за WCAG AA на paper і surface-2»
- «Поля форми листа без програмних лейблів, секції — не заголовки»
- «Таби довідників мають role="tab" без клавіатурного патерна табів»
