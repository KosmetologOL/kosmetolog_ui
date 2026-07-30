import { markdownToHtml } from "#types/markdown";

export interface StructuredRow {
  label: string;
  html: string;
  variant?: "default" | "warn";
}

export interface StructuredSection {
  heading: string;
  html: string;
}

export interface StructuredContent {
  intro: string;
  kv: StructuredRow[];
  boxes: StructuredRow[];
  callouts: string[];
  sections: StructuredSection[];
  isEmpty: boolean;
}

const KV_LABELS: Record<string, string> = {
  "що це": "Що це",
  "що буде відбуватися": "Що це",
  "як працює": "Як працює",
  "як процедура працює": "Як працює",
  "відчуття": "Відчуття",
  "реабілітація": "Реабілітація",
  "результат": "Результат",
  "коли очікувати результат": "Результат",
  "тривалість": "Тривалість",
  "тривалість процедури": "Тривалість",
};

const BOX_LABELS: Record<string, string> = {
  "підготовка": "Підготовка",
  "як підготуватися": "Підготовка",
  "після процедури": "Після процедури",
  "пам'ятка після проведення процедури": "Після процедури",
  "не можна": "Не можна",
};

const CALLOUT_LABELS: Record<string, string> = {
  "важливо": "Важливо",
};

type BlockKind = "kv" | "box" | "section" | "callout";

const normalizeHeading = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .replace(/['’ʼ]/g, "'")
    .replace(/[:?！？]+$/g, "")
    .trim();

const classifyLabel = (
  normalized: string,
): { kind: BlockKind; label: string; variant?: "default" | "warn" } | null => {
  if (KV_LABELS[normalized]) return { kind: "kv", label: KV_LABELS[normalized] };
  if (BOX_LABELS[normalized])
    return {
      kind: "box",
      label: BOX_LABELS[normalized],
      variant: normalized === "не можна" ? "warn" : "default",
    };
  if (CALLOUT_LABELS[normalized])
    return { kind: "callout", label: CALLOUT_LABELS[normalized] };
  return null;
};

const emptyContent = (): StructuredContent => ({
  intro: "",
  kv: [],
  boxes: [],
  callouts: [],
  sections: [],
  isEmpty: true,
});

// Дозволяє розпізнавати заголовки/списки, написані звичайним текстом
// (рядок-ярлик сам по собі, "Важливо: ..." в одному рядку, "- пункт"),
// а не лише через кнопки Heading/Bullet list редактора.
const LIST_MARKER_RE = /^\s*[-•*]\s+/;
const NUM_MARKER_RE = /^\s*\d+[.)]\s+/;
const LABEL_PREFIX_RE = /^\s*([^<>:\n]{2,40}):\s*(.*)$/s;

const textOf = (html: string): string => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || "").trim();
};

const LI_LABEL_RE = /^([^<>:\n]{2,40}):\s*/;

// Жирнить ярлик на початку пункту нумерованого списку ("Час збору: ..."),
// якщо він ще не виділений вручну через **...** в редакторі.
const boldLabelPrefix = (html: string): string => {
  if (/^\s*<(strong|b)\b/i.test(html)) return html;
  const match = html.match(LI_LABEL_RE);
  if (!match) return html;
  return `<strong>${match[1]}:</strong> ${html.slice(match[0].length)}`;
};

const boldOrderedListLabels = (list: HTMLElement) => {
  Array.from(list.children).forEach((li) => {
    li.innerHTML = boldLabelPrefix(li.innerHTML);
  });
};

const CALLOUT_LABEL = "Важливо";
// Номер клініки для Telegram/дзвінків — впізнається незалежно від форматування
// ("+380 (73) 838 23 23", "+38 (073) 838-23-23", "0738382323" тощо).
const CLINIC_PHONE_RE =
  /\+?3?8?0?\s*\(?0?73\)?[\s.-]*838[\s.-]*23[\s.-]*23/g;
const CALLOUT_LABEL_RE = new RegExp(
  `^\\s*(<p[^>]*>)?\\s*<(strong|b)>\\s*${CALLOUT_LABEL}`,
  "i",
);

// У блоці "Важливо" виділяє номер телефону клініки та підписує сам блок
// жирним словом "Важливо.", якщо редактор його ще не проставив.
const finalizeCallout = (html: string): string => {
  const withPhone = html.replace(
    CLINIC_PHONE_RE,
    (match) => `<strong>${match}</strong>`,
  );
  if (CALLOUT_LABEL_RE.test(withPhone)) return withPhone;
  const prefix = `<strong>${CALLOUT_LABEL}.</strong> `;
  if (/^\s*<p[^>]*>/i.test(withPhone)) {
    return withPhone.replace(/^(\s*<p[^>]*>)/i, `$1${prefix}`);
  }
  return `<p>${prefix}${withPhone}</p>`;
};

export const parseStructuredContent = (
  markdown: string | undefined,
): StructuredContent => {
  const html = markdownToHtml(markdown || "");
  if (!html) return emptyContent();

  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = Array.from(doc.body.children);
  if (nodes.length === 0) return emptyContent();

  const kv: StructuredRow[] = [];
  const boxes: StructuredRow[] = [];
  const callouts: string[] = [];
  const sections: StructuredSection[] = [];
  const introBuffer: string[] = [];

  type Active = {
    kind: BlockKind;
    label: string;
    variant?: "default" | "warn";
    buffer: string[];
  } | null;
  let active: Active = null;
  let pendingList: string[] = [];
  let pendingListTag: "ul" | "ol" = "ul";

  const targetBuffer = (): string[] => (active ? active.buffer : introBuffer);

  const flushList = () => {
    if (pendingList.length === 0) return;
    const items =
      pendingListTag === "ol" ? pendingList.map(boldLabelPrefix) : pendingList;
    const list = `<${pendingListTag}>${items
      .map((li) => `<li>${li}</li>`)
      .join("")}</${pendingListTag}>`;
    targetBuffer().push(list);
    pendingList = [];
    pendingListTag = "ul";
  };

  const flushBlock = () => {
    flushList();
    if (!active) return;
    const bodyHtml = active.buffer.join("");
    if (active.kind === "kv") kv.push({ label: active.label, html: bodyHtml });
    else if (active.kind === "box")
      boxes.push({ label: active.label, html: bodyHtml, variant: active.variant });
    else if (active.kind === "callout") callouts.push(finalizeCallout(bodyHtml));
    else sections.push({ heading: active.label, html: bodyHtml });
    active = null;
  };

  const startBlock = (
    kind: BlockKind,
    label: string,
    firstLineHtml?: string,
    variant?: "default" | "warn",
  ) => {
    flushBlock();
    active = { kind, label, variant, buffer: [] };
    if (firstLineHtml) active.buffer.push(`<p>${firstLineHtml}</p>`);
  };

  const handleLine = (lineHtml: string) => {
    const text = textOf(lineHtml);
    if (!text) {
      flushList();
      return;
    }

    const normalized = normalizeHeading(text);
    const wholeLineMatch = classifyLabel(normalized);
    if (wholeLineMatch) {
      flushList();
      startBlock(
        wholeLineMatch.kind,
        wholeLineMatch.label,
        undefined,
        wholeLineMatch.variant,
      );
      return;
    }

    const prefixMatch = text.match(LABEL_PREFIX_RE);
    if (prefixMatch) {
      const labelMatch = classifyLabel(normalizeHeading(prefixMatch[1]));
      if (labelMatch) {
        flushList();
        const remainderText = prefixMatch[2].trim();
        const escapedPrefix = prefixMatch[1].replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );
        const htmlPrefixRe = new RegExp(`^\\s*${escapedPrefix}\\s*:\\s*`);
        const remainderHtml = lineHtml.replace(htmlPrefixRe, "");
        startBlock(
          labelMatch.kind,
          labelMatch.label,
          remainderText ? remainderHtml : undefined,
          labelMatch.variant,
        );
        return;
      }
    }

    if (LIST_MARKER_RE.test(lineHtml)) {
      pendingListTag = "ul";
      pendingList.push(lineHtml.replace(LIST_MARKER_RE, ""));
      return;
    }

    if (NUM_MARKER_RE.test(lineHtml)) {
      pendingListTag = "ol";
      pendingList.push(lineHtml.replace(NUM_MARKER_RE, ""));
      return;
    }

    flushList();
    targetBuffer().push(`<p>${lineHtml}</p>`);
  };

  nodes.forEach((node) => {
    const tag = node.tagName.toLowerCase();

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      flushList();
      const match = classifyLabel(normalizeHeading(node.textContent || ""));
      if (match) startBlock(match.kind, match.label, undefined, match.variant);
      else startBlock("section", node.textContent || "");
      return;
    }

    if (tag === "blockquote") {
      flushList();
      flushBlock();
      callouts.push(finalizeCallout(node.innerHTML));
      return;
    }

    if (tag === "ul" || tag === "ol") {
      flushList();
      const listEl = node as HTMLElement;
      if (tag === "ol") boldOrderedListLabels(listEl);
      targetBuffer().push(listEl.outerHTML);
      return;
    }

    const innerHtml = (node as HTMLElement).innerHTML;
    innerHtml.split(/<br\s*\/?>/i).forEach(handleLine);
  });
  flushList();
  flushBlock();

  const intro = introBuffer.join("");
  const isEmpty =
    !intro &&
    kv.length === 0 &&
    boxes.length === 0 &&
    callouts.length === 0 &&
    sections.length === 0;

  return { intro, kv, boxes, callouts, sections, isEmpty };
};
