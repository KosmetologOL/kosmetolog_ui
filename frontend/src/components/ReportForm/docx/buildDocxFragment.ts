import { getCategories, type CategoryReportPosition } from "#api/referenceApi";
import type {
  GenerateReportHtmlParams,
} from "../html/generateReportHtml";
import { INCLUDE_MEDICATIONS_SECTION } from "../reportSectionFlags";
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
  color?: string;
  size?: number;
}

export const run = (text: string, options: RunOptions = {}): string => {
  if (text === "") return "";
  const rPr =
    options.bold || options.italic || options.color || options.size
      ? `<w:rPr>${options.bold ? "<w:b/>" : ""}${
          options.italic ? "<w:i/>" : ""
        }${options.color ? `<w:color w:val="${options.color}"/>` : ""}${
          options.size ? `<w:sz w:val="${options.size}"/>` : ""
        }</w:rPr>`
      : "";
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
};

const lineBreakRun = (): string => "<w:r><w:br/></w:r>";

// Плоскі багаторядкові поля (коментарі, додаткова інформація, фінальний текст)
// приходять із textarea з літеральними \n — усередині <w:t> Word показує їх як
// пробіли, тож кожен перенос стає окремим <w:br/>, як <br /> у HTML-версії.
const multilineRuns = (text: string): string =>
  text
    .split("\n")
    .map((line) => run(line))
    .join(lineBreakRun());

export const paragraph = (runsXml: string): string =>
  `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr>${runsXml}</w:p>`;

export const bulletParagraph = (runsXml: string): string =>
  `<w:p><w:pPr><w:spacing w:after="60"/><w:ind w:left="360"/></w:pPr>${run(
    "• ",
  )}${runsXml}</w:p>`;

// Нумерація йде звичайним текстом («1. »), як і буліт вище: у документ
// дописується лише фрагмент body.xml, власних <w:numbering> у ньому немає.
export const numberedParagraph = (index: number, runsXml: string): string =>
  `<w:p><w:pPr><w:spacing w:after="60"/><w:ind w:left="360"/></w:pPr>${run(
    `${index}. `,
  )}${runsXml}</w:p>`;

export const headingParagraph = (text: string): string =>
  `<w:p><w:pPr><w:spacing w:before="280" w:after="160"/></w:pPr>${run(text, {
    bold: true,
    color: "3D4025",
    size: 24,
  })}</w:p>`;

export const dividerParagraph = (text: string): string =>
  `<w:p><w:pPr><w:spacing w:before="240" w:after="160"/><w:pBdr><w:top w:val="single" w:sz="6" w:space="6" w:color="999999"/></w:pBdr></w:pPr>${run(
    text,
    { bold: true, italic: true },
  )}</w:p>`;

export const emptyParagraph = (): string => "<w:p/>";

const importantParagraph = (note?: string): string => {
  const trimmed = note?.trim();
  if (!trimmed) return "";
  return paragraph(run("Важливо: ", { bold: true }) + run(trimmed));
};

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
    medications,
    procedures,
    procedureStages = [],
    specialists,
    homeCares,
    categoryItems = [],
    additionalInfo,
    comments,
    finalNote,
    medicationsNote,
    homeCareNote,
    examsNote,
    proceduresNote,
  } = params;

  const today = new Date().toLocaleDateString("uk-UA");
  const parts: string[] = [];

  const categorySectionsByAnchor: Record<CategoryReportPosition, string[]> = {
    after_specialists: [],
    after_exams: [],
    after_medications: [],
    after_homecare: [],
    after_procedure_stages: [],
    after_procedures: [],
  };

  if (categoryItems.length > 0) {
    const categoriesMeta = await getCategories();
    const categoryNames = Array.from(
      new Set(categoryItems.map((c) => c.categoryName?.trim()).filter(Boolean)),
    );

    categoryNames.forEach((categoryName) => {
      const items = categoryItems.filter((c) => c.categoryName === categoryName);
      if (items.length === 0) return;

      const meta =
        categoriesMeta.find((cat) => cat._id === items[0].categoryId) ??
        categoriesMeta.find((cat) => cat.name === categoryName);
      const showName = meta?.showNameInReport ?? true;
      const anchor = meta?.reportPosition ?? "after_homecare";

      const xml =
        headingParagraph(categoryName as string) +
        items
          .map((c) => {
            const content = parseStructuredContent(c.recommendation);
            return showName
              ? itemParagraphs(c.itemName, content)
              : renderStructuredBodyAsDocxParagraphs(content);
          })
          .join("") +
        importantParagraph(meta?.importantNote);

      categorySectionsByAnchor[anchor].push(xml);
    });
  }

  const flushCategoriesFor = (anchor: CategoryReportPosition) => {
    categorySectionsByAnchor[anchor].forEach((xml) => parts.push(xml));
  };

  parts.push(emptyParagraph());
  parts.push(dividerParagraph(`Рекомендаційний лист · ${today}`));

  if (specialists.length > 0) {
    parts.push(headingParagraph("Суміжні спеціалісти"));
    // Кілька спеціалістів — нумерований список (як і в HTML-звіті),
    // один — просто рядок без номера.
    specialists.forEach((s, i) =>
      parts.push(
        specialists.length > 1
          ? numberedParagraph(i + 1, run(s.name, { bold: true }))
          : paragraph(run(s.name, { bold: true })),
      ),
    );
  }
  flushCategoriesFor("after_specialists");

  if (exams.length > 0) {
    parts.push(headingParagraph("Обстеження"));
    exams.forEach((e) =>
      parts.push(renderStructuredBodyAsDocxParagraphs(parseStructuredContent(e.recommendation))),
    );
    parts.push(importantParagraph(examsNote));
  }
  flushCategoriesFor("after_exams");

  // Той самий прапорець, що й у HTML-листі: розділ або є в обох форматах,
  // або його немає в жодному — див. ../reportSectionFlags.
  if (INCLUDE_MEDICATIONS_SECTION && medications.length > 0) {
    parts.push(headingParagraph("Засоби"));
    medications.forEach((m) =>
      parts.push(itemParagraphs(m.name, parseStructuredContent(m.recommendation))),
    );
    parts.push(importantParagraph(medicationsNote));
  }
  flushCategoriesFor("after_medications");

  if (homeCares.length > 0) {
    parts.push(headingParagraph("Домашній догляд"));
    // Групування — за назвами категорій із самих вибраних засобів (як і в
    // HTML-версії): довідник міг змінитися після збереження звіту, і засоби
    // перейменованої чи видаленої категорії випадали б із картки.
    const uniqueCategories = Array.from(
      new Set(homeCares.map((h) => h.name?.trim()).filter(Boolean)),
    );

    uniqueCategories.forEach((category) => {
      const items = homeCares.filter((h) => h.name?.trim() === category);
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
    parts.push(importantParagraph(homeCareNote));
  }
  flushCategoriesFor("after_homecare");

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
        const visitCount =
          proc.visitCountEnabled && proc.visitCount != null
            ? String(proc.visitCount)
            : "";
        const tags = [
          zone ? `Зона: ${zone}` : "",
          interval ? `Інтервал: ${interval}` : "",
          visitCount ? `Кількість візитів: ${visitCount}` : "",
        ]
          .filter(Boolean)
          .join(" · ");

        parts.push(
          bulletParagraph(
            run(proc.name, { bold: true }) + (tags ? run(` (${tags})`) : ""),
          ),
        );
        if (proc.comment?.trim()) {
          parts.push(paragraph(multilineRuns(proc.comment.trim())));
        }
      });
    });
    if (procedures.length === 0) {
      parts.push(importantParagraph(proceduresNote));
    }
  }
  flushCategoriesFor("after_procedure_stages");

  if (procedures.length > 0) {
    parts.push(headingParagraph("Рекомендації щодо процедур"));
    procedures.forEach((p) =>
      parts.push(itemParagraphs(p.name, parseStructuredContent(p.recommendation))),
    );
    parts.push(importantParagraph(proceduresNote));
  }
  flushCategoriesFor("after_procedures");

  if (additionalInfo?.trim()) {
    parts.push(headingParagraph("Все, що необхідно знати про ваш стан"));
    parts.push(paragraph(multilineRuns(additionalInfo.trim())));
  }

  if (comments?.trim()) {
    parts.push(headingParagraph("Додаткова інформація"));
    parts.push(paragraph(multilineRuns(comments.trim())));
  }

  if (finalNote?.trim()) {
    parts.push(paragraph(multilineRuns(finalNote.trim())));
  }

  return parts.join("");
};
