import { getAllHomeCares } from "#api/homeCaresApi";
import type {
  GenerateReportHtmlParams,
} from "../html/generateReportHtml";
import {
  parseStructuredContent,
  type StructuredContent,
  type StructuredRow,
} from "../html/structuredContent";

const escapeXml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&apos;";
    }
  });

interface RunOptions {
  bold?: boolean;
  italic?: boolean;
}

export const run = (text: string, options: RunOptions = {}): string => {
  if (text === "") return "";
  const rPr =
    options.bold || options.italic
      ? `<w:rPr>${options.bold ? "<w:b/>" : ""}${
          options.italic ? "<w:i/>" : ""
        }</w:rPr>`
      : "";
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
};

const lineBreakRun = (): string => "<w:r><w:br/></w:r>";

export const paragraph = (runsXml: string): string =>
  `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr>${runsXml}</w:p>`;

export const bulletParagraph = (runsXml: string): string =>
  `<w:p><w:pPr><w:spacing w:after="60"/><w:ind w:left="360"/></w:pPr>${run(
    "• ",
  )}${runsXml}</w:p>`;

export const headingParagraph = (text: string): string =>
  `<w:p><w:pPr><w:spacing w:before="200" w:after="120"/></w:pPr>${run(text, {
    bold: true,
  })}</w:p>`;

export const dividerParagraph = (text: string): string =>
  `<w:p><w:pPr><w:spacing w:before="240" w:after="160"/><w:pBdr><w:top w:val="single" w:sz="6" w:space="6" w:color="999999"/></w:pBdr></w:pPr>${run(
    text,
    { bold: true, italic: true },
  )}</w:p>`;

export const emptyParagraph = (): string => "<w:p/>";

const nodeToRuns = (node: ChildNode, inherited: RunOptions = {}): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return run(node.textContent || "", inherited);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === "br") return lineBreakRun();

  let options = inherited;
  if (tag === "strong" || tag === "b") options = { ...inherited, bold: true };
  else if (tag === "em" || tag === "i")
    options = { ...inherited, italic: true };

  return Array.from(el.childNodes)
    .map((child) => nodeToRuns(child, options))
    .join("");
};

const parseFragment = (html: string): HTMLElement | null => {
  if (!html?.trim()) return null;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  return doc.body.firstElementChild as HTMLElement | null;
};

// Вкладені списки всередині <li> "сплющуються" в текст батьківського буліту —
// nodeToRuns не має спеціального випадку для ul/ol, тож вони проходять через
// generic-рекурсію і додаються без власного відступу. Прийнятне спрощення.
export const htmlFragmentToParagraphs = (html: string): string => {
  const root = parseFragment(html);
  if (!root) return "";

  const paragraphs: string[] = [];

  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "ul" || tag === "ol") {
      Array.from(el.children).forEach((li) => {
        if (li.tagName.toLowerCase() !== "li") return;
        const runsXml = Array.from(li.childNodes)
          .map((child) => nodeToRuns(child))
          .join("");
        paragraphs.push(bulletParagraph(runsXml));
      });
      return;
    }

    const runsXml = Array.from(el.childNodes)
      .map((child) => nodeToRuns(child))
      .join("");
    if (runsXml) paragraphs.push(paragraph(runsXml));
  });

  return paragraphs.join("");
};

const runsFromHtmlFragment = (html: string): string => {
  const root = parseFragment(html);
  return root ? nodeToRuns(root) : "";
};

const kvParagraphs = (row: StructuredRow): string =>
  paragraph(run(`${row.label}:`, { bold: true })) +
  htmlFragmentToParagraphs(row.html);

export const renderStructuredBodyAsDocxParagraphs = (
  content: StructuredContent,
  fallback = "—",
): string => {
  if (content.isEmpty) return paragraph(run(fallback));

  const parts: string[] = [];

  if (content.intro) parts.push(htmlFragmentToParagraphs(content.intro));

  content.kv.forEach((row) => parts.push(kvParagraphs(row)));

  content.boxes.forEach((box) =>
    parts.push(headingParagraph(box.label) + htmlFragmentToParagraphs(box.html)),
  );

  content.sections.forEach((section) =>
    parts.push(
      headingParagraph(section.heading) +
        htmlFragmentToParagraphs(section.html),
    ),
  );

  content.callouts.forEach((callout) =>
    parts.push(bulletParagraph(runsFromHtmlFragment(callout))),
  );

  return parts.join("");
};

const itemParagraphs = (name: string, content: StructuredContent): string =>
  paragraph(run(name, { bold: true })) +
  renderStructuredBodyAsDocxParagraphs(content);

export const buildAppendParagraphsXml = async (
  params: GenerateReportHtmlParams,
): Promise<string> => {
  const {
    exams,
    procedures,
    procedureStages = [],
    specialists,
    homeCares,
    categoryItems = [],
    additionalInfo,
    comments,
    finalNote,
    doctorName,
  } = params;

  const today = new Date().toLocaleDateString("uk-UA");
  const parts: string[] = [];

  parts.push(emptyParagraph());
  parts.push(
    dividerParagraph(
      `Рекомендаційний лист · ${today} · Лікар: ${
        doctorName?.trim() || "—"
      }`,
    ),
  );

  if (specialists.length > 0) {
    parts.push(headingParagraph("Суміжні спеціалісти"));
    specialists.forEach((s) => parts.push(bulletParagraph(run(s.name))));
  }

  if (exams.length > 0) {
    parts.push(headingParagraph("Обстеження"));
    exams.forEach((e) =>
      parts.push(itemParagraphs(e.name, parseStructuredContent(e.recommendation))),
    );
  }

  const activeStages = procedureStages.filter((s) => s.procedures.length > 0);
  if (activeStages.length > 0) {
    parts.push(headingParagraph("Протокол процедур"));
    activeStages.forEach((stage, i) => {
      const workWith =
        stage.workWithEnabled && stage.workWith?.trim()
          ? stage.workWith.trim()
          : "";

      parts.push(
        paragraph(
          run(
            `${i + 1}. ${stage.title || `Етап ${i + 1}`}${
              workWith ? ` — робота з ${workWith}` : ""
            }`,
            { bold: true },
          ),
        ),
      );

      stage.procedures.forEach((proc) => {
        const zone = proc.zoneEnabled && proc.zone ? proc.zone : "";
        const interval =
          proc.intervalEnabled && proc.interval ? proc.interval : "";
        const tags = [
          zone ? `Зона: ${zone}` : "",
          interval ? `Інтервал: ${interval}` : "",
        ]
          .filter(Boolean)
          .join(" · ");

        parts.push(
          bulletParagraph(
            run(proc.name, { bold: true }) + (tags ? run(` (${tags})`) : ""),
          ),
        );
        if (proc.comment?.trim()) {
          parts.push(paragraph(run(proc.comment.trim())));
        }
      });
    });
  }

  if (homeCares.length > 0) {
    parts.push(headingParagraph("Домашній догляд"));
    const allCares = await getAllHomeCares();
    const uniqueCategories = Array.from(
      new Set(allCares.map((c) => c.name?.trim()).filter(Boolean)),
    );

    uniqueCategories.forEach((category) => {
      const items = homeCares.filter((h) => h.name === category);
      if (items.length === 0) return;

      parts.push(paragraph(run(category as string, { bold: true })));
      items.forEach((h) => {
        const when = [h.morning ? "день" : "", h.evening ? "вечір" : ""]
          .filter(Boolean)
          .join(", ");
        parts.push(
          bulletParagraph(
            run(h.medicationName || "—", { bold: true }) +
              (when ? run(` (${when})`) : ""),
          ),
        );
        parts.push(
          renderStructuredBodyAsDocxParagraphs(
            parseStructuredContent(h.recommendations),
            "Рекомендацію не знайдено",
          ),
        );
      });
    });
  }

  if (categoryItems.length > 0) {
    const categoryNames = Array.from(
      new Set(categoryItems.map((c) => c.categoryName?.trim()).filter(Boolean)),
    );

    categoryNames.forEach((categoryName) => {
      const items = categoryItems.filter((c) => c.categoryName === categoryName);
      if (items.length === 0) return;

      parts.push(headingParagraph(categoryName as string));
      items.forEach((c) =>
        parts.push(
          itemParagraphs(c.itemName, parseStructuredContent(c.recommendation)),
        ),
      );
    });
  }

  if (procedures.length > 0) {
    parts.push(headingParagraph("Рекомендації щодо процедур"));
    procedures.forEach((p) =>
      parts.push(itemParagraphs(p.name, parseStructuredContent(p.recommendation))),
    );
  }

  if (additionalInfo?.trim()) {
    parts.push(headingParagraph("Все, що необхідно знати про ваш стан"));
    parts.push(paragraph(run(additionalInfo.trim())));
  }

  if (comments?.trim()) {
    parts.push(headingParagraph("Додаткова інформація"));
    parts.push(paragraph(run(comments.trim())));
  }

  if (finalNote?.trim()) {
    parts.push(paragraph(run(finalNote.trim())));
  }

  return parts.join("");
};
