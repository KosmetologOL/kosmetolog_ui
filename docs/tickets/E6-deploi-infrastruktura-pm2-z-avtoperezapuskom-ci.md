# E6 · Деплой-інфраструктура: PM2 з автоперезапуском, CI на GitHub Actions, DEPLOY.md

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Бекенд і експлуатація | E5 |

## Контекст

Продакшн зараз запускається як голий `node dist/server.js` без процес-менеджера: після будь-якого падіння сервіс лежить до ручного втручання. CI немає взагалі — dev-режим ts-node-dev працює з --transpile-only (без перевірки типів), тож помилки компіляції видно лише при ручному npm run build, і PR можна змерджити зі зламаним білдом. Документованої процедури розгортання теж немає: фронтенд збирається локально і викладається вручну, знання процесу живе лише в голові. Цей тікет ставить мінімальну експлуатаційну базу: автоперезапуск, перевірки на PR і письмову інструкцію.

## Кроки реалізації

1. Створити backend/ecosystem.config.js: `module.exports = { apps: [{ name: "kosmetolog-backend", script: "dist/server.js", cwd: __dirname, autorestart: true, max_memory_restart: "300M", env: { NODE_ENV: "production" } }] };` На сервері (поза скоупом коду): `pm2 start ecosystem.config.js && pm2 save && pm2 startup`.
2. Створити .github/workflows/ci.yml: тригери pull_request і push у main; job «backend»: actions/checkout + setup-node (Node 22, cache npm), `cd backend && npm ci && npm run build`; job «frontend»: `cd frontend && npm ci && npm run lint && npm run build` з env VITE_API_URL: "http://localhost:5000" (щоб білд був детермінованим).
3. Створити DEPLOY.md у корені репозиторію: передумови (версія Node, env-файли backend/.env і frontend/.env зі списком змінних); деплой backend: git pull → cd backend → npm ci → npm run build → pm2 reload kosmetolog-backend; деплой frontend: cd frontend → npm ci → npm run build → викладання dist/ на хостинг; післядеплойна перевірка: GET /health повертає 200 (тікет E5); налаштування зовнішнього пінгера на /health; нотатка, чи стискає reverse-proxy відповіді (звʼязок з compression, тікет E4).

## Критерії приймання

- [ ] Кожен PR запускає CI; зламаний tsc-білд backend або eslint/білд frontend роблять перевірку червоною.
- [ ] `pm2 start ecosystem.config.js` піднімає зібраний сервер, а після вбивства процесу PM2 автоматично перезапускає його.
- [ ] DEPLOY.md містить повну процедуру, за якою розробник без контексту може викотити backend і frontend та перевірити результат через /health.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально: `cd backend && npm run build && npx pm2 start ecosystem.config.js && npx pm2 ls` → статус online; `kill -9 <pid із pm2 ls>` → за кілька секунд pm2 ls показує процес знову online з лічильником рестартів 1; прибрати за собою: `npx pm2 delete kosmetolog-backend`.
2. Запушити тестову гілку з навмисною помилкою типів у backend → CI червоний; виправити → зелений.
3. Пройти DEPLOY.md з чистого клона в тимчасовій теці — переконатися, що кроки виконуються без «прихованих» знань.

## Файли

- `backend/ecosystem.config.js`
- `.github/workflows/ci.yml`
- `DEPLOY.md`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Відсутня деплой-інфраструктура: немає CI, процес-менеджера і документованої процедури розгортання»
