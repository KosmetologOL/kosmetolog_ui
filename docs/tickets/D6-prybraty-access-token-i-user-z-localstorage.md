# D6 · Прибрати access-токен і user з localStorage

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P2** | S (до пів дня) | Автентифікація і безпека | — |

## Контекст

AuthProvider зберігає access-токен і обʼєкт user у localStorage (frontend/src/context/AuthProvider.tsx:22–23, 49) і на старті довірливо читає їх назад, включно з role (рядки 60–74). Це defense-in-depth-проблема: у разі XSS токен зчитується скриптом (хоч і живе лише 15 хв), а збережена копія user (роль!) використовується без перевірки. При цьому сесія і так повноцінно відновлюється без localStorage: tryRefresh() робить /auth/refresh (httpOnly-кука) + /auth/me (рядки 76–87) — саме цей шлях уже працює для випадку, коли savedToken відсутній. Тікет лишає токен тільки в памʼяті (стан + axios.defaults.headers), а ініціалізацію зводить до tryRefresh().

## Кроки реалізації

1. У frontend/src/context/AuthProvider.tsx у login() видалити рядки 22–23 (localStorage.setItem("token"…) і localStorage.setItem("user"…)).
2. У clearLocalSession() видалити рядки 30–31 (removeItem) — очищення переїде в ініціалізацію.
3. У registerAuthHandlers → updateToken видалити рядок 49 (localStorage.setItem("token", newToken)).
4. Спростити initializeAuth (рядки 58–104): прибрати читання savedToken/savedUser і гілку з getCurrentUser за збереженим токеном; нове тіло — одноразове прибирання спадщини + відновлення сесії:
const initializeAuth = async () => {
  // одноразово прибираємо значення, збережені попередніми версіями застосунку
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  await tryRefresh();
  setAuthReady(true);
};
(функцію tryRefresh лишити всередині як є).
5. Перевірити grep-ом, що інших читачів localStorage-ключів token/user у frontend/src немає (на момент написання — лише AuthProvider.tsx).
6. Запустити npm run lint і npm run build у frontend/.

## Критерії приймання

- [x] Після входу в localStorage немає ключів token і user (токен існує лише в стані React та axios.defaults.headers.common.Authorization)
- [x] Перезавантаження сторінки з активною сесією відновлює її через /auth/refresh + /auth/me без миготіння на /login (authReady-гейт працює)
- [x] Після logout перезавантаження сторінки не відновлює сесію
- [x] Старі значення token/user, що лишилися від попередньої версії, видаляються при першому завантаженні
- [x] npm run lint і npm run build проходять без помилок

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально запустити backend (тестова БД) і frontend. Перед входом вручну покласти сміття: у DevTools Console — localStorage.setItem('token','old'); localStorage.setItem('user','{}'); перезавантажити сторінку → обидва ключі зникли.
2. Увійти → DevTools → Application → Local Storage: ключів token/user немає; запити до API мають заголовок Authorization (вкладка Network).
3. Перезавантажити сторінку (F5) → у Network видно GET /auth/refresh і GET /auth/me, користувач лишається залогіненим, роль (адмін-розділи) коректна.
4. Вийти з системи → перезавантажити → залишаємось на /login.

## Файли

- `frontend/src/context/AuthProvider.tsx`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Access-токен і обʼєкт user зберігаються в localStorage»
