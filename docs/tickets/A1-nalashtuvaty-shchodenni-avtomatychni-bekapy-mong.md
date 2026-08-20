# A1 · Налаштувати щоденні автоматичні бекапи MongoDB з ротацією та перевіркою відновлення

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P0** | M (1–2 дні) | Безпека даних | — |

## Контекст

Продакшн-база проєкту — кластер MongoDB Atlas (URI в backend/.env), і для неї не існує ЖОДНОГО бекапа чи механізму відновлення — це прямо зафіксовано в CLAUDE.md. При цьому код містить безповоротні операції: жорстке видалення пацієнта (backend/src/services/patient.service.ts:26–28, findByIdAndDelete), повний перезапис листа без збереження попередньої версії (backend/src/services/reports.service.ts:156–163, findByIdAndUpdate), deleteMany у сідері та CSV-імпорт «видалити все → створити». Йдеться про медичні записи реальних пацієнтів: одна помилкова дія або збій — і дані втрачено назавжди. База маленька, тож щоденний mongodump на робочому Mac коштує $0 і закриває ризик уже сьогодні. Важливо: mongodump на цій машині ще не встановлений (перевірено which mongodump).

## Кроки реалізації

1. Встановити інструменти: `brew install mongodb-database-tools` (дає mongodump/mongorestore; після встановлення перевірити шлях через `which mongodump` — на Apple Silicon це /opt/homebrew/bin/mongodump, цей повний шлях знадобиться в скрипті, бо launchd має мінімальний PATH).
2. Створити в репозиторії теку ops/backup/ і скрипт ops/backup/mongodb-backup.sh (chmod +x):
```bash
#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="$HOME/Backups/kosmetolog"
ENV_FILE="$HOME/Dev/kosmetolog_ui/backend/.env"
mkdir -p "$BACKUP_DIR"
MONGODB_URI="$(grep '^MONGODB_URI=' "$ENV_FILE" | cut -d= -f2-)"
/opt/homebrew/bin/mongodump --uri="$MONGODB_URI" --gzip --archive="$BACKUP_DIR/kosmetology-$(date +%F).gz"
find "$BACKUP_DIR" -name 'kosmetology-*.gz' -mtime +30 -delete
```
Секрети НЕ зашивати в скрипт — URI читається з backend/.env. Тека бекапів — поза репозиторієм ($HOME/Backups), щоб дампи з даними пацієнтів не потрапили в git.
3. Додати копію в хмару (захист від виходу з ладу самого Mac): встановити rclone (`brew install rclone`, `rclone config` на будь-яке сховище — Google Drive/Dropbox/S3) і дописати в кінець скрипта рядок `/opt/homebrew/bin/rclone copy "$BACKUP_DIR" remote:kosmetolog-backups`.
4. Створити launchd-джоб: файл-шаблон ops/backup/com.kosmetolog.mongodb-backup.plist (Label=com.kosmetolog.mongodb-backup; ProgramArguments=[/bin/bash, $HOME/Dev/kosmetolog_ui/ops/backup/mongodb-backup.sh]; StartCalendarInterval Hour=3 Minute=0; StandardOutPath і StandardErrorPath → $HOME/Library/Logs/kosmetolog-backup.log). Скопіювати його в ~/Library/LaunchAgents/ і активувати: `launchctl load ~/Library/LaunchAgents/com.kosmetolog.mongodb-backup.plist`. launchd виконає пропущений запуск після пробудження Mac, якщо о 3:00 він спав.
5. Написати ops/backup/README.md українською: як влаштований бекап, де лежать архіви, і покрокова процедура відновлення СУВОРО на локальний mongod: `mongorestore --uri="mongodb://127.0.0.1:27017" --gzip --archive="$HOME/Backups/kosmetolog/kosmetology-YYYY-MM-DD.gz" --drop` (наголосити: --uri тільки 127.0.0.1, ніколи Atlas). Додати пункт «щомісячна перевірка»: відновити останній архів локально і звірити кількість документів (`mongosh kosmetology --eval 'db.patients.countDocuments()'` тощо) з очікуваною.
6. Зʼясувати тариф кластера в Atlas UI: якщо це безкоштовний M0 (там вбудованих бекапів немає взагалі) — зафіксувати в README рішення щодо переходу на Atlas Flex або M10 з автоматичними бекапами як другий рубіж захисту; mongodump-схема при цьому лишається.

## Критерії приймання

- [ ] Щоденний бекап створюється автоматично launchd-джобом без ручних дій, архів лягає в ~/Backups/kosmetolog і копіюється в хмару.
- [ ] Архіви старші за 30 днів автоматично видаляються, свіжіші — ні.
- [ ] Процедура відновлення задокументована в ops/backup/README.md і принаймні один раз реально виконана на локальний mongod з успішною звіркою кількості документів.
- [ ] Жоден секрет (MONGODB_URI) не зашитий у скрипт/plist і жоден дамп із даними пацієнтів не потрапляє в git.
- [ ] Тариф Atlas-кластера зʼясовано, рішення щодо вбудованих бекапів Atlas зафіксовано письмово в README.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Запустити скрипт вручну (`bash ops/backup/mongodb-backup.sh`) — mongodump є суто читальною операцією, для продакшн-БД це безпечно; переконатися, що в ~/Backups/kosmetolog зʼявився архів ненульового розміру.
2. Підняти локальний mongod (наприклад, `docker run -d -p 27017:27017 mongo:7`) і виконати mongorestore архіву на mongodb://127.0.0.1:27017; звірити countDocuments по patients/reports із живою базою (звірка через read-only mongosh-запити).
3. Перевірити ротацію без ризику: створити фейковий старий файл `touch -t 202501010000 ~/Backups/kosmetolog/kosmetology-2025-01-01.gz`, запустити скрипт — видалено тільки його, свіжий архів на місці.
4. Перевірити розклад: `launchctl kickstart -k gui/$(id -u)/com.kosmetolog.mongodb-backup` (або тимчасово поставити StartCalendarInterval на найближчу хвилину) — джоб відпрацьовує, лог пишеться в ~/Library/Logs/kosmetolog-backup.log.
5. Перевірити `git status` — жоден .gz-дамп не зʼявився в робочому дереві репозиторію.

## Файли

- `ops/backup/mongodb-backup.sh`
- `ops/backup/com.kosmetolog.mongodb-backup.plist`
- `ops/backup/README.md`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «[critical/S] Жодних бекапів MongoDB Atlas і жодного механізму відновлення даних»
