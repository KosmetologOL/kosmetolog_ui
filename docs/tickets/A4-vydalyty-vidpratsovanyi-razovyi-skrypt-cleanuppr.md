# A4 · Видалити відпрацьований разовий скрипт cleanupProcedureRecommendations.ts

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P2** | S (до пів дня) | Безпека даних | — |

## Контекст

У backend/src/scripts/ лежить одноразовий міграційний скрипт cleanupProcedureRecommendations.ts, який зрізає «футерний» текст (контакти, Instagram/Telegram тощо) з рекомендацій процедур і зберігає результат у БД. Міграція вже відпрацювала, скрипт не підключений до package.json і ніде не імпортується (перевірено grep по backend/ і frontend/src). При цьому він небезпечний як «міна на майбутнє»: dotenv-шлях на рядку 6 вказує на неіснуючий backend/src/config/.env; список патернів продубльований (масив FOOTER_PATTERNS, рядки 8–21, і вручну зібрана regex-альтернація на рядку 31), а fallback `const cutIndex = match?.index ?? 0` (рядок 32) при розходженні цих двох списків зріже рекомендацію до порожнього рядка і збереже її в БД (save, рядок 69) — базу без бекапів. Найдешевший фікс — прибрати скрипт: історія git збереже код, якщо він колись знадобиться.

## Кроки реалізації

1. Виконати `git rm backend/src/scripts/cleanupProcedureRecommendations.ts` (тека backend/src/scripts/ після цього стане порожньою і зникне з git автоматично).
2. Переконатися, що згадок не лишилося: `grep -rn "cleanupProcedureRecommendations" backend/src frontend/src` → порожньо (на момент постановки тікета інших згадок немає).
3. Якщо власник продукту вирішить, що скрипт ще знадобиться (єдина причина не видаляти) — замість видалення: (а) будувати альтернацію зі спільного джерела `new RegExp(FOOTER_PATTERNS.map((p) => p.source).join("|"), "iu")`; (б) при `match === null` повертати value без змін замість зрізання від індексу 0; (в) зробити dry-run режимом за замовчуванням (запис у БД лише з явним прапорцем --apply); (г) замінити рядок 6 на `import "dotenv/config";`. За замовчуванням — видаляти, це рішення тікета.

## Критерії приймання

- [ ] Файл backend/src/scripts/cleanupProcedureRecommendations.ts відсутній у робочому дереві, згадок про нього немає ніде в коді.
- [ ] Збірка бекенда проходить без помилок після видалення.
- [ ] Код скрипта доступний в історії git (git log --diff-filter=D показує коміт видалення).

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. `grep -rn "cleanupProcedureRecommendations" backend/src frontend/src` → жодного збігу.
2. `cd backend && npm run build` → компіляція успішна.
3. `git log --oneline --diff-filter=D -- backend/src/scripts/cleanupProcedureRecommendations.ts` → показує коміт, з якого файл можна відновити.

## Файли

- `backend/src/scripts/cleanupProcedureRecommendations.ts`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «[low/S] Одноразовий міграційний скрипт cleanupProcedureRecommendations: зламаний .env-шлях і небезпечний fallback cutIndex ?? 0»
