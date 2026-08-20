# Тікети за технічним аудитом · серпень 2026

Розбивка [технічного аудиту](../audit-2026-08.html) (99 верифікованих висновків) на тікети, готові до виконання. Кожен тікет самодостатній: контекст, кроки з точністю до файлу/рядка, критерії приймання і ручна перевірка (тест-сьюти в проєкті немає).

**56 тікетів: 9 × P0, 26 × P1, 21 × P2.**

Оцінки: **S** — до пів дня · **M** — 1–2 дні · **L** — 2–3 дні.

## Епіки

- **A · Безпека даних** — 4 тікетів
- **B · Шлях збереження листа** — 11 тікетів
- **C · Експорт: HTML і DOCX** — 10 тікетів
- **D · Автентифікація і безпека** — 10 тікетів
- **E · Бекенд і експлуатація** — 12 тікетів
- **F · Фронтенд і UX** — 9 тікетів

## P0 — критично: втрата даних і безпека (виконувати першими)

| # | Тікет | Оцінка | Епік | Залежить від |
|---|---|---|---|---|
| **A1** | [Налаштувати щоденні автоматичні бекапи MongoDB з ротацією та перевіркою відновлення](A1-nalashtuvaty-shchodenni-avtomatychni-bekapy-mong.md) | M | Безпека даних | — |
| **A2** | [Додати запобіжники в seed.ts: тільки локальна БД, явне підтвердження, лічильники перед видаленням, виправлений dotenv-шлях](A2-dodaty-zapobizhnyky-v-seed-ts-tilky-lokalna-bd-i.md) | S | Безпека даних | — |
| **B1** | [buildReportPayload: повернути нотатки розділів та кількість відвідувань у збережуваний лист](B1-buildreportpayload-povernuty-notatky-rozdiliv-ta.md) | S | Шлях збереження листа | — |
| **B2** | [CreateReportForm: розрізняти 404 і збій завантаження листа, екран помилки з повтором](B2-createreportform-rozrizniaty-404-i-zbii-zavantaz.md) | S | Шлях збереження листа | — |
| **C1** | [Безпечне дописування в .docx: вставляти лист через DOM замість текстового пошуку <w:sectPr>](C1-bezpechne-dopysuvannia-v-docx-vstavliaty-lyst-ch.md) | M | Експорт: HTML і DOCX | — |
| **C2** | [Дописування в картку: пікер до збереження, розрізнення помилок, звірка з пацієнтом і резервна копія](C2-dopysuvannia-v-kartku-piker-do-zberezhennia-rozr.md) | M | Експорт: HTML і DOCX | C1 |
| **C3** | [Полагодити невидимі тости експорту HTML і озвучити гілки no-folder/unsupported](C3-polahodyty-nevydymi-tosty-eksportu-html-i-ozvuch.md) | S | Експорт: HTML і DOCX | — |
| **D1** | [Перевіряти active і lockUntil у /auth/refresh](D1-pereviriaty-active-i-lockuntil-u-auth-refresh.md) | S | Автентифікація і безпека | — |
| **E1** | [Видалити мертвий GET /reports і каскадно видаляти листи разом з пацієнтом](E1-vydalyty-mertvyi-get-reports-i-kaskadno-vydaliat.md) | M | Бекенд і експлуатація | — |

## P1 — цей/наступний спринт

| # | Тікет | Оцінка | Епік | Залежить від |
|---|---|---|---|---|
| **A3** | [Переробити CSV-імпорт довідників на merge-стратегію з авто-знімком і видаленням зайвого наприкінці](A3-pererobyty-csv-import-dovidnykiv-na-merge-strate.md) | M | Безпека даних | A2 |
| **B3** | [Report.patient: unique-індекс, 409 на другий лист, getLastVisitMap через агрегацію](B3-report-patient-unique-indeks-409-na-druhyi-lyst.md) | M | Шлях збереження листа | B2 |
| **B4** | [Домашній догляд: унікальний _id для кожного доданого засобу](B4-domashnii-dohliad-unikalnyi-id-dlia-kozhnoho-dod.md) | S | Шлях збереження листа | — |
| **B5** | [Автозбереження чернетки листа в localStorage із відновленням](B5-avtozberezhennia-chernetky-lysta-v-localstorage.md) | M | Шлях збереження листа | — |
| **B6** | [UnsavedChangesContext: підтвердження при навігації шапкою та «Вийти», navigate замість history.back](B6-unsavedchangescontext-pidtverdzhennia-pry-naviha.md) | M | Шлях збереження листа | — |
| **B7** | [Повідомляти про закінчення сесії тостом при примусовому виході](B7-povidomliaty-pro-zakinchennia-sesii-tostom-pry-p.md) | S | Шлях збереження листа | B5 |
| **B8** | [Ревізії листа: зберігати попередню версію перед кожним оновленням](B8-revizii-lysta-zberihaty-poperedniu-versiiu-pered.md) | M | Шлях збереження листа | B1 |
| **C4** | [Експорт «Домашнього догляду»: групувати за вибраними засобами, а не за поточним довідником](C4-eksport-domashnoho-dohliadu-hrupuvaty-za-vybrany.md) | S | Експорт: HTML і DOCX | — |
| **C5** | [Спільний маппер reportToExportParams: однаковий експорт із форми листа і зі списку пацієнтів](C5-spilnyi-mapper-reporttoexportparams-odnakovyi-ek.md) | M | Експорт: HTML і DOCX | C2 |
| **C6** | [DOCX: зберігати переноси рядків у багаторядкових полях](C6-docx-zberihaty-perenosy-riadkiv-u-bahatoriadkovy.md) | S | Експорт: HTML і DOCX | — |
| **C7** | [Узгодити розділ «Засоби» між HTML і DOCX через спільний прапорець](C7-uzhodyty-rozdil-zasoby-mizh-html-i-docx-cherez-s.md) | S | Експорт: HTML і DOCX | — |
| **D2** | [Додати trust proxy і rate-limiter на /auth/refresh](D2-dodaty-trust-proxy-i-rate-limiter-na-auth-refres.md) | S | Автентифікація і безпека | — |
| **D3** | [Підключити helmet для безпекових HTTP-заголовків](D3-pidkliuchyty-helmet-dlia-bezpekovykh-http-zaholo.md) | S | Автентифікація і безпека | — |
| **D4** | [Серверні сесії refresh-токенів: ротація, відкликання, чесний rememberMe](D4-serverni-sesii-refresh-tokeniv-rotatsiia-vidklyk.md) | M | Автентифікація і безпека | D1 |
| **D5** | [Прибрати сирі повідомлення помилок: перевести auth/doctors/categories/registration-requests/home-cares на ApiError](D5-prybraty-syri-povidomlennia-pomylok-perevesty-au.md) | S | Автентифікація і безпека | D4 |
| **E2** | [Привести auth/categories/doctors/homeCare/registrationRequests-контролери до канонічного ApiError](E2-pryvesty-auth-categories-doctors-homecare-regist.md) | M | Бекенд і експлуатація | — |
| **E3** | [approveRegistration: перевіряти існуючий email і мапити E11000 на людське повідомлення](E3-approveregistration-pereviriaty-isnuiuchyi-email.md) | S | Бекенд і експлуатація | E2 |
| **E4** | [Явний ліміт тіла запиту 2mb, compression та українське повідомлення на 413](E4-iavnyi-limit-tila-zapytu-2mb-compression-ta-ukra.md) | S | Бекенд і експлуатація | — |
| **E5** | [Fail-fast підключення до MongoDB, ендпойнт /health і graceful shutdown](E5-fail-fast-pidkliuchennia-do-mongodb-endpoint-hea.md) | M | Бекенд і експлуатація | — |
| **E6** | [Деплой-інфраструктура: PM2 з автоперезапуском, CI на GitHub Actions, DEPLOY.md](E6-deploi-infrastruktura-pm2-z-avtoperezapuskom-ci.md) | M | Бекенд і експлуатація | E5 |
| **E7** | [Нормалізувати CLIENT_URL для CORS і перевіряти VITE_API_URL на фронтенді](E7-normalizuvaty-client-url-dlia-cors-i-pereviriaty.md) | S | Бекенд і експлуатація | — |
| **F1** | [Замінити Tiptap-конвертацію markdown на легкий парсер із кешем; дебаунс пошуку та «Показати ще» у CRUDManager](F1-zaminyty-tiptap-konvertatsiiu-markdown-na-lehkyi.md) | M | Фронтенд і UX | — |
| **F2** | [Вкладка «Пацієнти» в довідниках: власний менеджер із серверною пагінацією, пошуком і людяним підтвердженням видалення](F2-vkladka-patsiienty-v-dovidnykakh-vlasnyi-menedzh.md) | M | Фронтенд і UX | — |
| **F3** | [Єдине джерело типів звіту та типізація axios-відповідей (referenceApi, authApi)](F3-iedyne-dzherelo-typiv-zvitu-ta-typizatsiia-axios.md) | M | Фронтенд і UX | — |
| **F4** | [Явні error-стани замість фальшивого «порожнього списку» в менеджерах і формі листа](F4-iavni-error-stany-zamist-falshyvoho-porozhnoho-s.md) | M | Фронтенд і UX | F1 |
| **F5** | [Доступність: контраст токена ink-soft, програмні лейбли полів, заголовки секцій, клавіатурний патерн табів](F5-dostupnist-kontrast-tokena-ink-soft-prohramni-le.md) | M | Фронтенд і UX | — |

## P2 — прибирання і поліпшення

| # | Тікет | Оцінка | Епік | Залежить від |
|---|---|---|---|---|
| **A4** | [Видалити відпрацьований разовий скрипт cleanupProcedureRecommendations.ts](A4-vydalyty-vidpratsovanyi-razovyi-skrypt-cleanuppr.md) | S | Безпека даних | — |
| **B9** | [editHistory: атомарний $push з лімітом замість read-modify-write](B9-edithistory-atomarnyi-push-z-limitom-zamist-read.md) | S | Шлях збереження листа | B8 |
| **B10** | [ReferenceItemModal: не скидати введений текст при ре-рендері батька](B10-referenceitemmodal-ne-skydaty-vvedenyi-tekst-pry.md) | S | Шлях збереження листа | — |
| **B11** | [Перевмонтовувати CreateReportForm при зміні patientId (key на роуті)](B11-perevmontovuvaty-createreportform-pry-zmini-pati.md) | S | Шлях збереження листа | — |
| **C8** | [Санітизувати імена експортованих файлів (safeFileName)](C8-sanityzuvaty-imena-eksportovanykh-failiv-safefil.md) | S | Експорт: HTML і DOCX | — |
| **C9** | [Схуднення HTML-експорту і шрифтів: WOFF2, оптимізація лого, швидка конвертація в base64](C9-skhudnennia-html-eksportu-i-shryftiv-woff2-optym.md) | M | Експорт: HTML і DOCX | — |
| **C10** | [Динамічний імпорт коду експорту (generateReportHtml, appendReportToDocx, jszip)](C10-dynamichnyi-import-kodu-eksportu-generatereporth.md) | S | Експорт: HTML і DOCX | C2, C5 |
| **D6** | [Прибрати access-токен і user з localStorage](D6-prybraty-access-token-i-user-z-localstorage.md) | S | Автентифікація і безпека | — |
| **D7** | [Прибрати енумерацію акаунтів у відповідях login](D7-prybraty-enumeratsiiu-akauntiv-u-vidpovidiakh-lo.md) | S | Автентифікація і безпека | D5 |
| **D8** | [Захистити CSV-експорт від formula injection](D8-zakhystyty-csv-eksport-vid-formula-injection.md) | S | Автентифікація і безпека | — |
| **D9** | [LoginForm: перейти на useAuth та inline-валідацію полів](D9-loginform-pereity-na-useauth-ta-inline-validatsi.md) | S | Автентифікація і безпека | — |
| **D10** | [Зміна пароля користувачем і скидання адміном (backlog)](D10-zmina-parolia-korystuvachem-i-skydannia-adminom.md) | M | Автентифікація і безпека | D4 |
| **E8** | [Спостережуваність: pino-логування, Sentry і повноцінний ActivityLog з адмінським переглядом](E8-sposterezhuvanist-pino-lohuvannia-sentry-i-povno.md) | M | Бекенд і експлуатація | E1, E2, E4, E5 |
| **E9** | [Індекси і схеми: Patient timestamps та індекс createdAt, unique для Specialist/HomeCare, компаундний індекс CategoryItem](E9-indeksy-i-skhemy-patient-timestamps-ta-indeks-cr.md) | S | Бекенд і експлуатація | — |
| **E10** | [Прибрати ensureHomeCareOrder з read-шляху GET /home-cares](E10-prybraty-ensurehomecareorder-z-read-shliakhu-get.md) | S | Бекенд і експлуатація | — |
| **E11** | [Видалити мертвий код: admin.service, utils/generateTokens, cookieOptions, одрук «contoller», зайві поля валідатора HomeCare](E11-vydalyty-mertvyi-kod-admin-service-utils-generat.md) | S | Бекенд і експлуатація | E2 |
| **E12** | [Role у UserSchema: enum + lowercase, узгодити фільтри лікарів з конвенцією нечутливості до регістру](E12-role-u-userschema-enum-lowercase-uzhodyty-filtry.md) | S | Бекенд і експлуатація | E3 |
| **F6** | [Узгодити підтвердження: видалення процедури з листа та деактивація лікаря](F6-uzhodyty-pidtverdzhennia-vydalennia-protsedury-z.md) | S | Фронтенд і UX | — |
| **F7** | [Кнопка «Відхилити» для запитів на реєстрацію + DELETE-ендпоінт](F7-knopka-vidkhylyty-dlia-zapytiv-na-reiestratsiiu.md) | S | Фронтенд і UX | — |
| **F8** | [Форма листа: адаптивні ширини контролів етапу, точковий дебаунс SearchHomeCare, дешевший перерахунок isDirty](F8-forma-lysta-adaptyvni-shyryny-kontroliv-etapu-to.md) | M | Фронтенд і UX | F4 |
| **F9** | [Прибирання: мертві файли, перейменування pdfSaveLocation, дедублікація verifyDirectoryPermission, зайві devDependencies](F9-prybyrannia-mertvi-faily-pereimenuvannia-pdfsave.md) | S | Фронтенд і UX | — |

---
*Згенеровано з верифікованих висновків аудиту 2026-08-12. Роадмап нового функціоналу — окремий документ: `docs/roadmap-2026-08.html`.*
