# B5 · Автозбереження чернетки листа в localStorage із відновленням

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Шлях збереження листа | — |

## Контекст

Єдиний захист від втрати незбереженого листа — браузерний beforeunload-діалог (CreateReportForm.tsx:293–300) і window.confirm на кнопці «Назад» (302–310). Чернетка ніде не персиститься: після F5, крешу вкладки/браузера або виходу з сесії (протухлий refresh-токен → logout → редірект на /login → форма розмонтовується) вся набрана робота лікаря зникає. Для основного робочого сценарію — тривалого заповнення листа з довідників — це найдорожча за наслідками прогалина. Інфраструктура наполовину готова: currentSnapshot (рядки 133–165) — уже серіалізований JSON усього стану форми, а savedSnapshot — базовий знімок для порівняння. Додатково axios працює без таймауту: завислий бекенд крутить спінер нескінченно.

## Кроки реалізації

1. Створити frontend/src/lib/reportDraft.ts: ключ `report-draft:<patientId>`, значення JSON `{ snapshot: string; savedAt: number }`; експортувати saveReportDraft(patientId, snapshot) (localStorage.setItem у try/catch — сховище може бути переповнене), loadReportDraft(patientId): ReportDraft | null (JSON.parse у try/catch, биту чернетку видаляти) та clearReportDraft(patientId).
2. У CreateReportForm.tsx після обчислення isDirty (рядок 167) додати ефект автозбереження з депсами [patientId, currentSnapshot, savedSnapshot]: якщо !patientId || savedSnapshot === null — нічого не робити; якщо currentSnapshot === savedSnapshot — clearReportDraft(patientId); інакше setTimeout ≈1000 мс → saveReportDraft(patientId, currentSnapshot); cleanup — clearTimeout.
3. Додати useRef<string | null> для останнього «брудного» снапшота (оновлювати в ефекті автозбереження: currentSnapshot якщо брудний, інакше null) і окремий ефект із порожніми депсами, чий cleanup при розмонтуванні синхронно пише ref у чернетку — це покриває SPA-редірект на /login при протуханні сесії, коли debounce ще не спрацював.
4. Додати ефект відновлення: коли savedSnapshot уперше стає не-null (одноразовість — через useRef-прапорець), викликати loadReportDraft(patientId); якщо чернетки немає або draft.snapshot === savedSnapshot — clearReportDraft і вихід; інакше показати window.confirm(`Знайдено незбережену чернетку листа від ${new Date(draft.savedAt).toLocaleString("uk-UA")}. Відновити її?`). При згоді — JSON.parse(draft.snapshot) і застосувати всі поля через сеттери: setSelectedExams, setSelectedMedications, setSelectedSpecialists, setSelectedHomeCares, setSelectedCategoryItems, setProcedureStages, setComments, setAdditionalInfo, setFinalNote, setMedicationsNote, setHomeCareNote, setExamsNote, setProceduresNote (форма стане «брудною» відносно savedSnapshot — це очікувано, лікар збереже). При відмові — clearReportDraft(patientId).
5. У saveReport після setSavedSnapshot(currentSnapshot) (рядок 483) додати clearReportDraft(patientId).
6. У frontend/src/main.tsx перед setupGlobalErrorHandling() додати таймаут HTTP-запитів:
```ts
import axios from "axios";

axios.defaults.timeout = 30000;
```
7. Виконати `npm run lint` у frontend/.

## Критерії приймання

- [ ] Через ~1 с після будь-якої зміни у формі в localStorage зʼявляється/оновлюється ключ report-draft:<patientId> з актуальним снапшотом і часом.
- [ ] При відкритті форми з чернеткою, що відрізняється від збереженого листа, показується пропозиція відновлення з датою/часом; згода відновлює всі розділи форми, відмова видаляє чернетку.
- [ ] Після успішного «Зберегти лист» чернетка видаляється; якщо повернути форму до збереженого стану вручну — чернетка теж зникає.
- [ ] Чернетка пацієнта A ніколи не пропонується і не застосовується у формі пацієнта B.
- [ ] Розмонтування форми з незбереженими змінами (напр. редірект на /login) лишає в localStorage актуальну чернетку.
- [ ] axios.defaults.timeout = 30000 задано глобально.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально: відкрити лист тестового пацієнта, заповнити кілька розділів, зачекати 2 с; у DevTools → Application → Local Storage перевірити ключ report-draft:<patientId>.
2. F5 → підтвердити відновлення → всі розділи на місці; «Зберегти лист» → ключ зник із localStorage.
3. Знову змінити форму, F5, у діалозі відмовитися — форма показує збережений стан, чернетка видалена.
4. Сесійний сценарій: змінити форму, у DevTools зіпсувати значення token у Local Storage і видалити refresh-cookie (Application → Cookies), натиснути «Зберегти лист» — після редіректу на /login увійти знову, відкрити той самий лист: пропозиція відновлення з набраними змінами.
5. Відкрити лист іншого тестового пацієнта — жодних пропозицій чужої чернетки.

## Файли

- `frontend/src/lib/reportDraft.ts`
- `frontend/src/components/ReportForm/CreateReportForm.tsx`
- `frontend/src/main.tsx`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Напівзаповнений лист не переживає перезавантаження сторінки»
- «Чернетка листа не зберігається: збій мережі, вихід із сесії чи креш вкладки втрачає роботу лікаря»
