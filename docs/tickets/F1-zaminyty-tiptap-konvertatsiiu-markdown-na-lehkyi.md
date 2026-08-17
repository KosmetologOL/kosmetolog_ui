# F1 · Замінити Tiptap-конвертацію markdown на легкий парсер із кешем; дебаунс пошуку та «Показати ще» у CRUDManager

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P1** | M (1–2 дні) | Фронтенд і UX | — |

## Контекст

Функція markdownToHtml (frontend/src/lib/markdown.ts) на КОЖЕН виклик створює повноцінний Tiptap/ProseMirror Editor (схема, плагіни, DOM-вузол) і одразу знищує його — лише щоб конвертувати один рядок markdown у HTML. Її викликає FormattedText для кожного рядка довідника в CRUDManager, кожного результату автокомпліту (SearchMedication/SearchProcedure/SearchExam/SearchHomeCare/SearchCategories), кожного чипа вибраного і кожного елемента при HTML-експорті листа (parseStructuredContent). На довіднику із сотнями записів відкриття вкладки означає сотні інстанціювань редактора — відчутний фриз головного потоку. Додатково: CRUDManager рендерить весь довідник без пагінації і фільтрує клієнтський пошук на кожне натискання клавіші без дебаунсу, а SearchCategories у формі листа до вводу пошуку показує ВСІ записи всіх категорій одразу. Tiptap при цьому має лишитися тільки в RichTextEditor — там він доречний.

## Кроки реалізації

1. У frontend/ виконати `npm install marked` (пакет має власні типи, @types не потрібні).
2. Повністю переписати frontend/src/lib/markdown.ts (прибрати імпорти @tiptap/core, @tiptap/starter-kit, tiptap-markdown; сигнатуру markdownToHtml(markdown: string): string зберегти — її використовують FormattedText.tsx:18 і structuredContent.ts:140). Готовий код:
```ts
import DOMPurify from "dompurify";
import { marked } from "marked";

// breaks: true — як було в tiptap-markdown (Markdown.configure({ breaks: true }))
marked.use({ gfm: true, breaks: true });

const CACHE_LIMIT = 500;
const cache = new Map<string, string>();

export const markdownToHtml = (markdown: string): string => {
  if (!markdown.trim()) {
    return "";
  }

  const cached = cache.get(markdown);
  if (cached !== undefined) {
    // LRU: пересуваємо запис у кінець
    cache.delete(markdown);
    cache.set(markdown, cached);
    return cached;
  }

  const html = DOMPurify.sanitize(marked.parse(markdown, { async: false }));

  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(markdown, html);

  return html;
};
```
3. Пакети @tiptap/* і tiptap-markdown із package.json НЕ видаляти — їх використовує components/RichTextEditor.tsx.
4. frontend/src/components/CRUDManager.tsx: додати `import { useDebouncedValue } from "#hooks/useDebouncedValue";` і після оголошення стану search (рядок 73) — `const debouncedSearch = useDebouncedValue(search, 300);`. Рядок 87 замінити на `const normalizedSearch = debouncedSearch.trim().toLowerCase();`.
5. CRUDManager.tsx: додати «Показати ще» — стан `const [visibleCount, setVisibleCount] = useState(50);` + ефект скидання `useEffect(() => { setVisibleCount(50); }, [normalizedSearch]);`. У рендері списку (рядок 437) мапити `filteredList.slice(0, visibleCount)` замість filteredList; після закриття div зі списком (рядок 487) додати: `{filteredList.length > visibleCount && (<button type="button" onClick={() => setVisibleCount((c) => c + 50)} className="btn btn-ghost btn-sm mt-3 self-center">Показати ще ({filteredList.length - visibleCount})</button>)}`.
6. frontend/src/components/Categories/SearchCategories.tsx: на рівні модуля оголосити `const CATEGORY_PREVIEW_LIMIT = 20;`. Рядки 123–125 замінити на: `const matchingItems = search ? items.filter((item) => item.name.toLowerCase().includes(search)) : items.slice(0, CATEGORY_PREVIEW_LIMIT);`. Після блоку зі списком записів (після div на рядках 161–188) додати підказку: `{!search && items.length > CATEGORY_PREVIEW_LIMIT && (<p className="mt-2 text-xs text-ink-soft">Показано перші {CATEGORY_PREVIEW_LIMIT} із {items.length} записів — скористайтеся пошуком.</p>)}`.
7. Звірити рендеринг: tiptap загортав вміст <li> у <p>, marked (компактні списки) — ні; перевірити стилі .rich-content в index.css і за потреби додати правило для li, щоб списки в чипах/довідниках/експорті виглядали як раніше.

## Критерії приймання

- [ ] markdown.ts не імпортує жодного @tiptap-пакета; Tiptap лишається тільки в RichTextEditor.tsx.
- [ ] Типові рекомендації (жирний, курсив, marked-списки, переноси рядків) у довідниках, чипах, stage-card і HTML-експорті листа виглядають так само, як до зміни.
- [ ] Повторна конвертація того самого markdown повертається з кеша (Map, ліміт 500 записів, LRU-витіснення).
- [ ] Вкладка довідника із сотнями записів відкривається без фризу; рендеряться перші 50 рядків + кнопка «Показати ще (N)», яка догружає ще по 50.
- [ ] Пошук у CRUDManager фільтрує список після паузи вводу (~300 мс), а не на кожну літеру; лічильник «Знайдено: X з Y» коректний.
- [ ] У секції «Категорії» форми листа до вводу пошуку видно не більше 20 записів на категорію з підказкою «Показано перші 20 із N»; пошук шукає по всіх записах.
- [ ] `npm run build` і `npm run lint` у frontend/ проходять без помилок.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Запустити backend (`npm run dev`) і frontend (`npm run dev`) локально.
2. Відкрити Довідники → «Засоби» (найбільший довідник): вкладка відкривається швидко, видно 50 рядків і кнопку «Показати ще»; рекомендації з жирним/списками рендеряться як раніше.
3. Набрати текст у пошуку записів — фільтрація спрацьовує після короткої паузи; очистити пошук — знову 50 рядків.
4. Відкрити форму листа пацієнта: перевірити рекомендації в результатах пошуку засобів/процедур і в чипах вибраного; у секції «Категорії» — обрізання до 20 записів із підказкою.
5. Зробити «Завантажити HTML» для тестового пацієнта і порівняти структуру листа (заголовки, списки, виділення, блок «Важливо») зі збереженим раніше експортом.
6. Опційно: у DevTools → Performance записати відкриття вкладки довідника до/після — зникають довгі таски від конструктора Editor.

## Файли

- `frontend/src/lib/markdown.ts`
- `frontend/src/components/CRUDManager.tsx`
- `frontend/src/components/Categories/SearchCategories.tsx`
- `frontend/package.json`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «markdownToHtml створює повноцінний Tiptap Editor на кожен рядок списку — блокування головного потоку на сотнях записів»
- «markdownToHtml створює повний TipTap Editor на кожен виклик»
- «Продуктивність довгих списків: повний Tiptap Editor на кожен елемент списку + довідники без пагінації»
