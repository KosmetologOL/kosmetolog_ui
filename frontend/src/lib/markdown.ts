import DOMPurify from "dompurify";
import { marked } from "marked";

// breaks: true — як було в tiptap-markdown (Markdown.configure({ breaks: true })).
// Токенайзери html/tag вимкнено, щоб відтворити Markdown.configure({ html: false }):
// сирі теги в тексті рекомендації показуються як текст, а не інтерпретуються.
marked.use({
  gfm: true,
  breaks: true,
  tokenizer: {
    html: () => undefined,
    tag: () => undefined,
    // GFM перетворює «голий» URL у посилання, а Tiptap лишав його текстом.
    // У рекомендаціях таке посилання отримало б браузерний синій стиль
    // (у .rich-content правила для a немає) — тож поведінку збережено.
    url: () => undefined,
  },
});

const CACHE_LIMIT = 500;
const cache = new Map<string, string>();

// marked (на відміну від Tiptap getHTML) розділяє блоки переносами рядків.
// Результат рендериться в .rich-content, де стоїть white-space: pre-wrap,
// тож такі переноси перетворилися б на зайві порожні рядки. Прибираємо
// лише ті, що стоять МІЖ тегами (`>` перед \n), — всередині <pre><code>
// переносу передує сам текст, тому вміст кодових блоків лишається цілим.
const stripBlockNewlines = (html: string): string =>
  html.replace(/>\n+</g, "><").trim();

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

  const html = DOMPurify.sanitize(
    stripBlockNewlines(marked.parse(markdown, { async: false })),
  );

  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(markdown, html);

  return html;
};
