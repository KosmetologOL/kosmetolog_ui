# F4 · Явні error-стани замість фальшивого «порожнього списку» в менеджерах і формі листа

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Фронтенд і UX | F1 |

## Контекст

У пʼятьох компонентах фетч зроблено через try/finally БЕЗ catch і без стану помилки: якщо запит упав, список лишається порожнім і користувач бачить «Записів ще немає» (CRUDManager), «Немає лікарів» (DoctorsManager), «Немає нових запитів на реєстрацію» (RegistrationRequestsManager — адмін може реально пропустити запити), «Категорій ще немає…» (SearchCategories), а секція «Домашній догляд» у формі листа взагалі рендериться порожньою без жодного тексту (SearchHomeCare). Єдиний сигнал — генеричний тост від глобального обробника, який легко не помітити. Еталонна реалізація вже є в проєкті: PatientList.tsx має стан hasError і екран «Не вдалося завантажити… [Спробувати ще раз]» (рядки 40, 164–175) — треба повторити цей патерн.

## Кроки реалізації

1. frontend/src/components/CRUDManager.tsx: додати стан `const [hasError, setHasError] = useState(false);`. У fetchList (рядки 98–119) на початку try → setHasError(false), додати `catch { setHasError(true); }` перед finally. У рендері між гілкою скелетонів (399–415) і гілкою порожнього списку (416) вставити: `hasError ? (<div className="w-full py-8 text-center"><p className="font-bold mb-1.5">Не вдалося завантажити записи</p><p className="text-ink-soft mb-4">Перевірте зʼєднання з інтернетом і спробуйте ще раз.</p><button type="button" onClick={() => void fetchList()} className="btn btn-tint btn-sm">Спробувати ще раз</button></div>) : …`.
2. frontend/src/components/Admin/DoctorsManager.tsx: аналогічно — hasError у load (рядки 19–26, скидання перед запитом), гілка помилки в рендері перед `doctors.length === 0` (рядок 99) з кнопкою retry → void load().
3. frontend/src/components/Admin/RegistrationRequestsManager.tsx: аналогічно в load (рядки 15–27); гілка помилки перед «Немає нових запитів на реєстрацію» (71–74). Подію registrationRequestsUpdated при помилці не диспатчити (вона і так у try).
4. frontend/src/components/Categories/SearchCategories.tsx: у loadCategories (41–58) додати hasError (скидати на початку); при hasError рендерити замість «Категорій ще немає. Додайте їх у розділі…» (110–116): `<p className="text-sm text-ink-soft">Не вдалося завантажити категорії. <button type="button" onClick={() => void loadCategories()} className="btn-link">Спробувати ще раз</button></p>`.
5. frontend/src/components/HomeCare/SearchHomeCare.tsx: у fetchCares (32–44) додати catch → setHasError(true) (скидати перед запитом). Після гілки loadingCares (118–120) додати: якщо hasError — «Не вдалося завантажити категорії догляду. [Спробувати ще раз]» (кнопка → void fetchCares(), для цього винести fetchCares з useEffect у useCallback); якщо allHomeCares.length === 0 — `<p className="text-sm text-ink-soft">Категорій догляду ще немає. Додайте їх у розділі «Довідники → Домашній догляд».</p>` (зараз секція рендериться повністю порожньою).
6. Тексти — українською, апостроф ʼ (U+02BC), еліпсис … (U+2026).

## Критерії приймання

- [x] Зі зупиненим бекендом кожен із пʼяти компонентів показує явне повідомлення про помилку з кнопкою повтору, а не «…ще немає» чи порожню секцію.
- [x] Кнопка «Спробувати ще раз» після відновлення бекенда підвантажує дані без перезавантаження сторінки.
- [x] Справжній порожній стан (успішна відповідь із 0 записів) виглядає як раніше; у SearchHomeCare при 0 категорій зʼявляється підказка замість пустоти.
- [x] Стан помилки скидається при успішному повторному завантаженні.
- [x] `npm run lint` у frontend/ чистий.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Запустити frontend БЕЗ бекенда (або зупинити backend): відкрити Довідники → будь-який довідник (CRUDManager), «Лікарі», «Запити» — усюди екран помилки з retry.
2. Відкрити форму листа пацієнта (сторінка впаде на даних пацієнта — тому цей кейс перевірити інакше): запустити backend, відкрити форму, потім зупинити backend і натиснути retry-кнопки в секціях «Категорії» і «Домашній догляд» — стан помилки відображається коректно.
3. Запустити backend і натиснути «Спробувати ще раз» у кожному місці — дані завантажуються.
4. Тимчасово спорожнити пошуковий фільтр і переконатися, що порожні стани (0 записів) не зламані.

## Файли

- `frontend/src/components/CRUDManager.tsx`
- `frontend/src/components/Admin/DoctorsManager.tsx`
- `frontend/src/components/Admin/RegistrationRequestsManager.tsx`
- `frontend/src/components/Categories/SearchCategories.tsx`
- `frontend/src/components/HomeCare/SearchHomeCare.tsx`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Помилка завантаження у довідниках виглядає як порожній список «Записів ще немає»»
