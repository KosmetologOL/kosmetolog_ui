# E4 · Явний ліміт тіла запиту 2mb, compression та українське повідомлення на 413

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | S (до пів дня) | Бекенд і експлуатація | — |

## Контекст

express.json() в app.ts:19 підключений без опцій, тобто з дефолтним лімітом тіла 100kb. При цьому валідатор листа (report.validation.ts) дозволяє до 200 000 символів у кожному з 7 вільнотекстових полів і до 200 елементів масивів з полями до 100 000 символів. Кирилиця в UTF-8 займає 2 байти на символ, тож цілком валідний за Joi лист легко перевищує 100kb — body-parser відкине його з 413 і англомовним «request entity too large» ще ДО валідації, і лікар втратить набраний текст без зрозумілого пояснення. Крім того, у застосунку немає compression: довгі українські markdown-рекомендації (getAll довідників віддає всі записи цілком) ганяються нестисненими, хоча gzip стискає такий JSON у рази.

## Кроки реалізації

1. `cd backend && npm i compression && npm i -D @types/compression`.
2. backend/src/app.ts: додати `import compression from "compression";` і рядок `app.use(compression());` одразу після `const app = express();` (рядок 10).
3. backend/src/app.ts: рядки 19–20 замінити на `app.use(express.json({ limit: "2mb" }));` та `app.use(express.urlencoded({ extended: true, limit: "2mb" }));` (2mb з запасом покриває максимальний Joi-валідний лист).
4. backend/src/middlewares/errorHandler.ts: після рядка 10 (console.error) додати мапінг помилки body-parser: `if ((err as { type?: string }).type === "entity.too.large") { return res.status(413).json({ message: "Занадто великий обсяг даних" }); }`
5. Занотувати для тікета E6 (DEPLOY.md): якщо прод стоїть за nginx/проксі, що вже стискає відповіді, Node-компресія не завадить, але конфігурацію треба зафіксувати документально.

## Критерії приймання

- [ ] POST /reports з валідним тілом ~300–500kb (довгі кириличні текстові поля) повертає 201, а не 413.
- [ ] Тіло понад 2mb → 413 з JSON {"message":"Занадто великий обсяг даних"} (українською).
- [ ] Відповіді API містять Content-Encoding: gzip при запиті з Accept-Encoding: gzip.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально згенерувати валідний payload листа з additionalInfo на ~150 000 кириличних символів (невеликий node -e скрипт) і надіслати POST /reports для ТЕСТОВОГО пацієнта → 201; після перевірки лист/пацієнта видалити через UI.
2. Той самий скрипт з тілом >2mb → 413 і українське повідомлення.
3. `curl -s -o /dev/null -D - -H "Accept-Encoding: gzip" -H "Authorization: Bearer <token>" http://localhost:5000/home-cares` → у заголовках Content-Encoding: gzip.
4. `cd backend && npm run build`.

## Файли

- `backend/src/app.ts`
- `backend/src/middlewares/errorHandler.ts`
- `backend/package.json`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Ліміт тіла запиту 100kb менший за дозволені валідатором 200 000 символів у звіті»
- «Відсутній compression і явний ліміт JSON-тіла в Express»
