# F3 · Єдине джерело типів звіту та типізація axios-відповідей (referenceApi, authApi)

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Фронтенд і UX | — |

## Контекст

Типи процедур звіту оголошені тричі: IReportProcedure/IReportProcedureStage в api/reportsApi.ts:12–31, інлайнові interface у CreateReportForm.tsx:211–230 і ще одна копія в lib/normalizeProcedureStages.ts:3–19. Копії вже розійшлися: lib-версія не має полів zone/interval/visitCount/workWith, через що при HTML-експорті листа зі списку пацієнтів уже губилися дані «робота з …». Логіка групування legacy-процедур по етапах теж продубльована (CreateReportForm.tsx:251–271 ≈ normalizeProcedureStages.ts:33–48). Крім того, частина axios-викликів не типізована: у referenceApi.ts категорії та їхні записи повертають неявний any, а authApi.refreshToken — нетипізований, хоча на його полі accessToken тримається весь ланцюжок оновлення сесії. Завдання — звести типи до одного джерела (reportsApi.ts) і додати дженерики всім викликам.

## Кроки реалізації

1. frontend/src/components/ReportForm/CreateReportForm.tsx: видалити інлайнові interface ReportProcedure (рядки 211–223) і ReportProcedureStage (225–230); додати в наявний імпорт з #api/reportsApi типи IReportProcedure та IReportProcedureStage і використати їх у касті на рядках 235–236 (`reportData.procedureStages as IReportProcedureStage[]`) та 251 (`reportData.procedures as IReportProcedure[]`).
2. frontend/src/lib/normalizeProcedureStages.ts: видалити локальні ReportProcedure/ReportProcedureStage/Report (рядки 3–19); імпортувати IReport, IReportProcedure, IReportProcedureStage з #api/reportsApi; параметр функції — `report: Pick<IReport, "procedures" | "procedureStages">`. Саме відсутність zone/interval/visitCount/workWith у старому локальному типі ховала ці поля від коду експорту.
3. Обʼєднати групування: у normalizeProcedureStages.ts експортувати `export const groupProceduresByStage = (procedures: IReportProcedure[]): { title: string; procedures: IReportProcedure[] }[]` (тіло — поточні рядки 33–48) і використати її всередині normalizeProcedureStages.
4. У CreateReportForm.tsx:251–271 замінити дубль reduce/Object.entries викликом groupProceduresByStage(...), домапивши результат до IProcedureStage: `{ id: crypto.randomUUID(), title, workWithEnabled: false, workWith: "", procedures: withOtherFlags(procedures as RawStageProcedure[]) }`.
5. Якщо tsc почне вимагати recommendation (в IReportProcedure воно обовʼязкове, у старому локальному типі — опційне): зробити його опційним (`recommendation?: string`) саме в reportsApi.ts як єдиному джерелі правди, і поправити місця використання.
6. frontend/src/api/referenceApi.ts — типізувати всі виклики категорій: рядок 94 → `axios.get<{ categories: ICategory[] }>`; createCategory (104) → `axios.post<{ category: ICategory }>` і тип повернення Promise<ICategory>; updateCategory (120) → `axios.patch<{ category: ICategory }>`; listCategoryItems (137) → `axios.get<{ items: ICategoryItem[] }>`; createCategoryItem (146) → `axios.post<{ item: ICategoryItem }>` → Promise<ICategoryItem>; updateCategoryItem (158) → `axios.patch<{ item: ICategoryItem }>` → Promise<ICategoryItem>.
7. frontend/src/api/authApi.ts:56–59 — готовий код:
```ts
export const refreshToken = async () => {
  const { data } = await axios.get<{ accessToken: string }>(`${API_URL}/refresh`);
  return data;
};
```
8. Спільний пакет типів frontend/backend — свідомо ПОЗА цим тікетом (довгострокова задача).
9. Прогнати `npm run build` (tsc -b відловить розбіжності типів) і `npm run lint` у frontend/.

## Критерії приймання

- [x] grep по frontend/src не знаходить interface ReportProcedure / ReportProcedureStage поза api/reportsApi.ts.
- [x] Групування legacy-процедур по етапах існує в одному місці (groupProceduresByStage) і використовується і формою листа, і normalizeProcedureStages.
- [x] Усі виклики в referenceApi.ts і authApi.refreshToken мають явні типи відповіді; повернення функцій — не неявний any (перевіряється наведенням у редакторі або tsc).
- [x] `npm run build` проходить без помилок типів; `npm run lint` чистий.
- [x] HTML-експорт зі списку пацієнтів для звіту зі старим форматом procedures має доступ до всіх полів етапу (zone/interval/visitCount/workWith) через типізований результат normalizeProcedureStages.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. `cd frontend && npm run build && npm run lint`.
2. У dev: відкрити пацієнта з наявним листом, зберегти без змін, перезавантажити — етапи/процедури/«Робота з»/зони/інтервали на місці.
3. Експортувати HTML того самого пацієнта і з форми листа, і кнопкою в реєстрі пацієнтів — вміст етапів однаковий.
4. Перевірити CRUD категорій: створити тестову категорію, додати запис, відредагувати, видалити — все працює, у консолі немає помилок.
5. Перевірити, що сесія оновлюється: залишити вкладку до протухання access-токена (або тимчасово вкоротити TTL локально) — запит після 401 повторюється успішно.

## Файли

- `frontend/src/api/reportsApi.ts`
- `frontend/src/components/ReportForm/CreateReportForm.tsx`
- `frontend/src/lib/normalizeProcedureStages.ts`
- `frontend/src/api/referenceApi.ts`
- `frontend/src/api/authApi.ts`
- `frontend/src/components/PatientList/PatientItem.tsx`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Дубльовані типи звіту в трьох місцях і нетипізовані відповіді axios»
