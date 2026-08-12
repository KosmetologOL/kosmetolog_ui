# D4 · Серверні сесії refresh-токенів: ротація, відкликання, чесний rememberMe

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Автентифікація і безпека | D1 |

## Контекст

Refresh-токен зараз — stateless JWT ({ id }, 7 днів, backend/src/services/auth.service.ts:9–11), який ніде не зберігається і не ротується: /auth/refresh повертає лише новий accessToken, а logout (auth.controller.ts:59–67) лише чистить cookie. Наслідки: викрадений refresh-токен чинний повні 7 діб і його неможливо відкликати; «вийти з усіх пристроїв» або миттєво «вимкнути» користувача не можна. Додатково зламаний rememberMe: кука живе 30 днів (auth.controller.ts:38), а JWT всередині — завжди 7, тож із 8-го дня користувач з «Запамʼятати мене» отримує примусовий розлогін, потенційно посеред редагування листа. Ще й auth.service.login повертає cookieOptions (рядки 89–94: sameSite "strict", інші maxAge), які контролер повністю ігнорує — мертвий код, що вводить в оману. Тікет запроваджує колекцію сесій у MongoDB: збереження хеша refresh-токена при login, перевірка+ротація при refresh, видалення при logout і деактивації.

## Кроки реалізації

1. Створити модель backend/src/models/RefreshSessionSchema.ts: поля userId (ObjectId, ref "User", index), tokenHash (String, required, unique), rememberMe (Boolean, default false), expiresAt (Date, required); { timestamps: true }; TTL-індекс: RefreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }).
2. У backend/src/services/auth.service.ts додати import crypto from "node:crypto" і хелпер: const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex"); (sha256, не bcrypt — потрібен пошук за хешем).
3. generateTokens (рядки 7–13): додати параметр rememberMe: boolean; підписувати refresh з expiresIn: rememberMe ? "30d" : "7d"; повертати також refreshTtlMs = (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000.
4. login(): передавати rememberMe у generateTokens; після генерації створювати сесію: await RefreshSession.create({ userId: user._id, tokenHash: hashToken(refreshToken), rememberMe, expiresAt: new Date(Date.now() + refreshTtlMs) }); видалити мертвий обʼєкт cookieOptions (рядки 89–94) і поле cookieOptions з return; повертати refreshTtlMs.
5. refresh(): після наявних перевірок user/active/lockUntil (з D1) знайти сесію за hashToken(token); якщо сесії немає або session.expiresAt.getTime() <= Date.now() — кидати помилку (токен відкликано/прострочено; явна перевірка потрібна, бо TTL-монітор Mongo видаляє документи із запізненням до ~60 с). Ротація: згенерувати нову пару за session.rememberMe, створити нову сесію, а старій виставити expiresAt = new Date(Date.now() + 60_000) — grace-період 60 с, щоб паралельний refresh із другої вкладки не розлогінював користувача. Повертати { accessToken, refreshToken, refreshTtlMs }.
6. Додати export const revokeRefreshToken = (token: string) => RefreshSession.deleteOne({ tokenHash: hashToken(token) });
7. backend/src/controllers/auth.controller.ts, loginUser: у res.cookie взяти maxAge: refreshTtlMs із відповіді сервісу (єдине джерело правди) і звузити path до "/auth" (кука читається лише в /auth/refresh та /auth/logout; сервіс змонтовано під /auth — див. routes/index.ts:22); httpOnly/secure:true/sameSite:"none" залишити як є — фронт і бек на різних origin (cors credentials, axios withCredentials).
8. refreshToken-контролер: після AuthService.refresh(token) виставляти нову куку res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true, sameSite: "none", path: "/auth", maxAge: refreshTtlMs }) і повертати { accessToken }.
9. logoutUser: зробити async; прочитати req.cookies.refreshToken і, якщо є, await AuthService.revokeRefreshToken(token) у try/catch; чистити куку двічі — з path: "/auth" (нова) і path: "/" (стара, видана до цього релізу), інакше стара не зітреться. Старі куки без сесії в БД і так стануть недійсними при першому refresh — одноразовий перелогін усіх користувачів після релізу очікуваний.
10. backend/src/services/doctors.service.ts: у toggleUserActive при active === false додати await RefreshSession.deleteMany({ userId: user._id }); у deleteDoctor після видалення — await RefreshSession.deleteMany({ userId: doctor._id }). Це нова колекція короткоживучих сесій, пацієнтських даних не торкаємось.
11. Фронтенд не змінювати: нова кука ставиться сервером автоматично (httpOnly), authApi.refreshToken читає лише accessToken, axios.defaults.withCredentials = true вже увімкнено (frontend/src/api/authApi.ts:5).

## Критерії приймання

- [ ] Login з rememberMe: true видає куку Max-Age 30 діб і refresh-JWT з exp через 30 діб; без rememberMe — 7/7 (розбіжності немає)
- [ ] Кожен успішний GET /auth/refresh повертає новий accessToken, ставить нову refresh-куку і закриває стару сесію; стара кука через 60+ с після ротації → 403
- [ ] POST /auth/logout видаляє сесію з БД: повторний refresh тією ж кукою → 403
- [ ] Деактивація користувача (PATCH /doctors/:id/active { active: false }) видаляє всі його сесії — refresh дає 403 негайно, не через 7 діб
- [ ] Обʼєкт cookieOptions у auth.service.login видалено; maxAge куки визначається в одному місці (refreshTtlMs із сервісу)
- [ ] Два паралельні запити /auth/refresh (дві вкладки) в межах grace-періоду обидва завершуються успішно
- [ ] Колекція refreshsessions має TTL-індекс по expiresAt — прострочені сесії зникають самі

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локальна тестова БД (як у D1), npm run dev. Login з rememberMe: curl -s -i -c cookies.txt -X POST http://localhost:5000/auth/login -H 'Content-Type: application/json' -d '{"email":"doc@test.local","password":"secret1","rememberMe":true}' → у Set-Cookie Max-Age=2592000 і Path=/auth; декодувати exp refresh-токена з cookies.txt: node -e "const t=process.argv[1].split('.')[1];console.log(new Date(JSON.parse(Buffer.from(t,'base64url').toString()).exp*1000))" <refreshToken> → ~30 діб.
2. Ротація: curl -s -i -b cookies.txt -c cookies2.txt http://localhost:5000/auth/refresh → 200, у відповіді новий Set-Cookie; почекати >60 с і повторити зі СТАРОЮ cookies.txt → 403; з новою cookies2.txt → 200.
3. Grace-період: одразу після ротації (без паузи) refresh старою кукою → 200 (паралельні вкладки не ламаються).
4. Logout: curl -s -b cookies2.txt -X POST http://localhost:5000/auth/logout → у mongosh db.refreshsessions.find() запис зник; refresh тією ж кукою → 403.
5. Деактивація: увійти ще раз, у mongosh db.users.updateOne({email:"doc@test.local"},{$set:{role:"admin"}}) для другого тестового акаунта або просто db.users.updateOne(...,{$set:{active:false}}) → db.refreshsessions.find({}) — сесій деактивованого немає після PATCH /doctors/:id/active (або перевірити напряму, що refresh → 403).
6. TTL-індекс: у mongosh db.refreshsessions.getIndexes() містить { expiresAt: 1 } з expireAfterSeconds: 0.
7. UI-перевірка: фронтенд локально — увійти, попрацювати >15 хв (або дочекатись 401), переконатися що інтерсептор оновлює сесію непомітно; вийти — повторне завантаження сторінки веде на /login.

## Файли

- `backend/src/models/RefreshSessionSchema.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/services/doctors.service.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Refresh-токени без ротації, серверного зберігання та відкликання; logout нічого не інвалідовує»
- «rememberMe обіцяє 30 днів, а refresh-JWT завжди живе 7; cookieOptions із сервісу — мертвий код»
- «Розбіжність життя refresh-токена і cookie: «Запамʼятати мене» мовчки вмирає через 7 днів»
