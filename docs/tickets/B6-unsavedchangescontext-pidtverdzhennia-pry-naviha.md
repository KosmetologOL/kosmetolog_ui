# B6 · UnsavedChangesContext: підтвердження при навігації шапкою та «Вийти», navigate замість history.back

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Шлях збереження листа | — |

## Контекст

Захист від втрати незбереженого листа зараз діє лише на закриття вкладки (beforeunload, CreateReportForm.tsx:293–300) і на кнопки «Назад»/«Закрити» самої форми (window.confirm у handleClose, 302–310). Клік по «Пацієнти» чи «Довідники» в шапці (AppShell.tsx:44–57) — клієнтський перехід react-router, який beforeunload не ловить; «Вийти» (66–71) одразу чистить сесію. Один випадковий клік — і робота над листом втрачена без попередження, хоча прапорець isDirty у формі вже обчислюється (рядок 167). Додатково handleClose викликає window.history.back() — якщо лист відкрили прямим посиланням у новій вкладці, «Назад» веде за межі застосунку. Потрібен спільний контекст «є незбережені зміни», який форма наповнює, а шапка перевіряє перед переходом (за паттерном XContext + useX, як AuthContext/useAuth).

## Кроки реалізації

1. Створити frontend/src/context/UnsavedChangesContext.ts:
```ts
import { createContext } from "react";

export interface UnsavedChangesContextProps {
  setIsDirty: (dirty: boolean) => void;
  /** true — можна йти (форма чиста або користувач підтвердив). */
  confirmLeave: () => boolean;
}

export const UnsavedChangesContext = createContext<
  UnsavedChangesContextProps | undefined
>(undefined);
```
2. Створити frontend/src/context/UnsavedChangesProvider.tsx — стан у ref (ре-рендери не потрібні), value стабільний:
```tsx
import { UnsavedChangesContext } from "#context/UnsavedChangesContext";
import React, { useMemo, useRef } from "react";

export const UnsavedChangesProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const isDirtyRef = useRef(false);

  const value = useMemo(
    () => ({
      setIsDirty: (dirty: boolean) => {
        isDirtyRef.current = dirty;
      },
      confirmLeave: () =>
        !isDirtyRef.current ||
        window.confirm("Є незбережені зміни. Закрити без збереження?"),
    }),
    [],
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
};
```
3. Створити frontend/src/hooks/useUnsavedChanges.ts за зразком useAuth.ts (useContext + throw поза провайдером).
4. У frontend/src/App.tsx обгорнути <AppRouter /> у <UnsavedChangesProvider> (усередині AuthProvider).
5. У CreateReportForm.tsx: `const { setIsDirty } = useUnsavedChanges();` і ефект після обчислення isDirty (рядок 167):
```ts
  useEffect(() => {
    setIsDirty(isDirty);
    return () => setIsDirty(false);
  }, [isDirty, setIsDirty]);
```
6. У frontend/src/layouts/AppShell.tsx: `const { confirmLeave } = useUnsavedChanges();`; для Link «Пацієнти» (рядки 45–51) і NavLink «Довідники» (53–55) додати `onClick={(e) => { if (!confirmLeave()) e.preventDefault(); }}`; кнопку «Вийти» (66–71) змінити на `onClick={() => { if (!confirmLeave()) return; void logout(); }}`.
7. У CreateReportForm.tsx handleClose (рядок 309): замінити `window.history.back();` на `navigate("/patients");` — додати useNavigate до імпорту react-router-dom (рядок 17) і `const navigate = useNavigate();` поруч із useParams; додати navigate у депси useCallback.
8. Виконати `npm run lint` у frontend/.

## Критерії приймання

- [x] З незбереженими змінами клік «Пацієнти», «Довідники» або «Вийти» показує підтвердження «Є незбережені зміни. Закрити без збереження?»; «Скасувати» лишає на сторінці листа з незмінним станом форми, «OK» виконує перехід/вихід.
- [x] З чистою формою (щойно збережено або нічого не змінено) підтвердження не зʼявляється.
- [x] Після розмонтування форми (перехід підтверджено) прапорець скидається — на інших сторінках навігація не питає підтвердження.
- [x] «Назад» із листа, відкритого прямим посиланням у новій вкладці, веде на /patients, а не за межі застосунку.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально: відкрити лист тестового пацієнта, змінити будь-яке поле; клікнути «Пацієнти» → діалог; «Скасувати» → лишаємось, стан на місці; «OK» → перехід.
2. Повторити для «Довідники» (під admin/doctor) і «Вийти» (скасування не розлогінює).
3. Зберегти лист і клікнути «Пацієнти» — переходить одразу, без діалогу.
4. Відкрити /create-report/<patientId> у новій вкладці напряму, натиснути «← Назад» без змін — опиняємось на /patients.
5. Після переходу з листа на /patients клік «Довідники» не показує діалог (прапорець скинуто).

## Файли

- `frontend/src/context/UnsavedChangesContext.ts`
- `frontend/src/context/UnsavedChangesProvider.tsx`
- `frontend/src/hooks/useUnsavedChanges.ts`
- `frontend/src/App.tsx`
- `frontend/src/layouts/AppShell.tsx`
- `frontend/src/components/ReportForm/CreateReportForm.tsx`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Навігація в шапці та «Вийти» обходять захист незбережених змін листа»
