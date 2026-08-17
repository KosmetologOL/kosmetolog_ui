# D9 · LoginForm: перейти на useAuth та inline-валідацію полів

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P2** | S (до пів дня) | Автентифікація і безпека | — |

## Контекст

У LoginForm дві споріднені проблеми. Перша: це єдине місце в кодовій базі, де контекст береться напряму — const { login } = useContext(AuthContext)! (LoginForm.tsx:11) — замість хука useAuth, який кидає зрозумілу помилку поза провайдером; non-null assertion ховає можливий null і порушує проєктний патерн «XContext + useX». Друга: validateForm (рядки 21–36) показує помилки лише транзитними тостами — поля не підсвічуються, немає aria-invalid, хоча дизайн-система має готові класи .is-invalid/.field-error (index.css), а PatientFormModal демонструє правильний inline-патерн. До того ж перевірка «пароль ≥ 6 символів» виконується і в режимі входу, хоча бекендна loginSchema вимагає лише required (auth.validation.ts:23) — користувач зі старим коротким паролем не зможе навіть відправити форму, яку бекенд прийняв би.

## Кроки реалізації

1. У frontend/src/components/Auth/LoginForm.tsx замінити рядок 11 на const { login } = useAuth(); додати import { useAuth } from "#hooks/useAuth"; прибрати імпорти AuthContext і useContext (рядки 5, 7).
2. Розширити frontend/src/components/Auth/AuthInput.tsx: додати в Props необовʼязкові error?: string і errorId?: string; обгорнути input у <div>, рендерити className={`field-input${error ? " is-invalid" : ""}`}, aria-invalid={error ? true : undefined}, aria-describedby={error ? errorId : undefined}, а під інпутом {error && <p id={errorId} className="field-error">{error}</p>} — за зразком PatientFormModal.tsx:81–85.
3. У LoginForm додати стан const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({}); переписати validateForm: збирати обʼєкт errors (порожній email/пароль → «Поле обовʼязкове», некоректний email → «Некоректний email», і ЛИШЕ при isRegister — password.length < 6 → «Пароль має бути не менше 6 символів»), викликати setFieldErrors(errors) і повертати Object.keys(errors).length === 0; тости з validateForm прибрати.
4. Передати в AuthInput email: error={fieldErrors.email} errorId="login-email-error", пароль: error={fieldErrors.password} errorId="login-password-error"; в onChange кожного поля скидати його помилку: setFieldErrors((prev) => ({ ...prev, email: undefined })).
5. Тости лишити тільки для серверних помилок у catch handleSubmit (рядки 77–89 — прокидання serverMessage вже зроблено добре) та для перевірки імені/прізвища лікаря (рядки 51–54) — за бажанням її теж можна зробити inline, але це не обовʼязково.
6. npm run lint у frontend/.

## Критерії приймання

- [ ] grep -rn 'useContext(AuthContext)' frontend/src не знаходить збігів поза hooks/useAuth.ts
- [ ] Сабміт порожньої форми входу не викликає тостів — помилки зʼявляються під полями з класами .is-invalid/.field-error та aria-invalid/aria-describedby
- [ ] У режимі входу пароль коротший за 6 символів НЕ блокується фронтом — запит іде на сервер (бекендна loginSchema вимагає лише required)
- [ ] У режимі реєстрації пароль <6 символів дає inline-помилку «Пароль має бути не менше 6 символів»
- [ ] Введення в поле з помилкою прибирає його підсвітку; серверні помилки досі показуються тостом
- [ ] npm run lint проходить

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально запустити frontend проти локального backend (тестова БД). На /login натиснути «Увійти» з порожніми полями → обидва поля з рамкою danger і текстами під ними, тостів немає; перевірити в DevTools наявність aria-invalid="true" і aria-describedby.
2. Почати вводити email → помилка email зникає, помилка пароля лишається.
3. Режим входу: email існуючого користувача + пароль «1234» → форма відправляється (запит у Network), сервер відповідає «Неправильний email або пароль» тостом — фронт більше не блокує короткий пароль.
4. Режим реєстрації: пароль «1234» → inline-помилка під полем, запит НЕ відправляється.
5. Успішний вхід тестовим користувачем працює як раніше.

## Файли

- `frontend/src/components/Auth/LoginForm.tsx`
- `frontend/src/components/Auth/AuthInput.tsx`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «LoginForm обходить useAuth: useContext(AuthContext) з non-null assertion»
- «Валідація логіну — тільки транзитними тостами, а перевірка «мінімум 6 символів» блокує і вхід»
