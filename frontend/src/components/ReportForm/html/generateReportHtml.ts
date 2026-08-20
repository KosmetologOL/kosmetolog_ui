import type { IExam } from "#api/examsApi";
import type { IHomeCare } from "#api/homeCaresApi";
import type { IMedication } from "#api/medicationsApi";
import type { IPatient } from "#api/patientsApi";
import type { IProcedure } from "#api/proceduresApi";
import { getCategories, type CategoryReportPosition } from "#api/referenceApi";
import type { ISpecialist } from "#api/specialistsApi";
import type { IReportCategoryItem } from "#components/Categories/SearchCategories";
import logoUrl from "#assets/logo.png";
import NoahBoldTTFUrl from "#fonts/Noah-Bold.ttf";
import NoahTTFUrl from "#fonts/Noah-Regular.ttf";
import toast from "react-hot-toast";
import { saveHtmlBlob } from "#lib/htmlSaveLocation";
import { INCLUDE_MEDICATIONS_SECTION } from "../reportSectionFlags";
import {
  parseStructuredContent,
  type StructuredContent,
} from "./structuredContent";

export interface IProcedureStage {
  title: string;
  workWithEnabled?: boolean;
  workWith?: string;
  procedures: (IProcedure & {
    comment?: string;
    price?: number;
    zoneEnabled?: boolean;
    zone?: string;
    intervalEnabled?: boolean;
    interval?: string;
    visitCountEnabled?: boolean;
    visitCount?: number;
  })[];
}

export interface GenerateReportHtmlParams {
  patient: IPatient;
  exams: IExam[];
  medications: IMedication[];
  procedures: IProcedure[];
  procedureStages?: IProcedureStage[];
  specialists: ISpecialist[];
  homeCares: IHomeCare[];
  categoryItems?: IReportCategoryItem[];
  additionalInfo: string;
  comments: string;
  finalNote?: string;
  medicationsNote?: string;
  homeCareNote?: string;
  examsNote?: string;
  proceduresNote?: string;
  doctorName?: string;
  directoryHandle?: FileSystemDirectoryHandle | null;
}

const escapeHtml = (text: string): string =>
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
        return "&#39;";
    }
  });

const plainTextToHtml = (text: string): string =>
  `<p class="plain">${escapeHtml(text).replace(/\n/g, "<br />")}</p>`;

const importantBlock = (note?: string): string => {
  const trimmed = note?.trim();
  if (!trimmed) return "";
  return `
    <div class="important">
      <span class="mark">!</span>
      ${plainTextToHtml(trimmed)}
    </div>`;
};

const renderStructuredBody = (
  content: StructuredContent,
  fallback = "—",
): string => {
  if (content.isEmpty) return `<p>${escapeHtml(fallback)}</p>`;

  const parts: string[] = [];

  if (content.intro) {
    parts.push(`<div class="rich-content">${content.intro}</div>`);
  }

  if (content.kv.length > 0) {
    const rows = content.kv
      .map(
        (row) => `
        <div class="kv">
          <span class="k">${escapeHtml(row.label)}</span>
          <div class="v rich-content">${row.html}</div>
        </div>`,
      )
      .join("");
    parts.push(`<div class="det">${rows}</div>`);
  }

  content.boxes.forEach((box) => {
    const boxClass = box.variant === "warn" ? "det-box det-box--warn" : "det-box";
    parts.push(`
      <div class="${boxClass}">
        <div class="det-t">${escapeHtml(box.label)}</div>
        <div class="rich-content">${box.html}</div>
      </div>`);
  });

  content.sections.forEach((section) => {
    parts.push(`
      <h3 class="sub-h">${escapeHtml(section.heading)}</h3>
      <div class="rich-content">${section.html}</div>`);
  });

  content.callouts.forEach((callout) => {
    parts.push(`
      <div class="important">
        <span class="mark">!</span>
        <div class="rich-content">${callout}</div>
      </div>`);
  });

  return parts.join("");
};

const itemBlock = (name: string, content: StructuredContent): string => `
  <div class="item-block">
    <div class="item-name">${escapeHtml(name)}</div>
    <div class="item-body">${renderStructuredBody(content)}</div>
  </div>`;

// Категорія з вимкненим «показувати назву в звіті» — та сама картка, але
// без .item-name. Раніше такі блоки малювались класом .exam (як
// обстеження) і на друку лишались у рамці; окремий модифікатор дає їм
// оформлення .item-block (на друку — лінія-роздільник замість рамки) і
// водночас дозволяє змінювати їх незалежно від іменованих карток.
const plainItemBlock = (content: StructuredContent): string => `
  <div class="item-block item-block--plain">
    <div class="item-body">${renderStructuredBody(content)}</div>
  </div>`;

const pad2 = (n: number): string => String(n).padStart(2, "0");

const secWrap = (num: number, title: string, inner: string): string => `
  <section class="sec">
    <div class="sec-head">
      <span class="sec-num">${pad2(num)}</span>
      <h2 class="sec-title">${escapeHtml(title)}</h2>
    </div>
    ${inner}
  </section>`;

const fetchAsBase64 = async (url: string): Promise<string> => {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  return btoa(
    new Uint8Array(arrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      "",
    ),
  );
};

const fetchAsDataUrl = async (url: string): Promise<string> => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

export const generateReportHtml = async ({
  patient,
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
  doctorName,
  directoryHandle,
}: GenerateReportHtmlParams) => {
  let logoDataUrl = "";
  try {
    logoDataUrl = await fetchAsDataUrl(logoUrl);
  } catch {
    toast.error("Не вдалося завантажити логотип для звіту.");
  }

  const [noahRegularBase64, noahBoldBase64] = await Promise.all([
    fetchAsBase64(NoahTTFUrl),
    fetchAsBase64(NoahBoldTTFUrl),
  ]);

  const sectionBodies: { title: string; html: string }[] = [];

  const categorySectionsByAnchor: Record<
    CategoryReportPosition,
    { title: string; html: string }[]
  > = {
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

    for (const categoryName of categoryNames) {
      const items = categoryItems.filter((c) => c.categoryName === categoryName);
      if (items.length === 0) continue;

      const meta =
        categoriesMeta.find((cat) => cat._id === items[0].categoryId) ??
        categoriesMeta.find((cat) => cat.name === categoryName);
      const showName = meta?.showNameInReport ?? true;
      const anchor = meta?.reportPosition ?? "after_homecare";

      const blocks = items
        .map((c) => {
          const content = parseStructuredContent(c.recommendation);
          return showName
            ? itemBlock(c.itemName, content)
            : plainItemBlock(content);
        })
        .join("");

      categorySectionsByAnchor[anchor].push({
        title: categoryName as string,
        html: blocks + importantBlock(meta?.importantNote),
      });
    }
  }

  const flushCategoriesFor = (anchor: CategoryReportPosition) => {
    sectionBodies.push(...categorySectionsByAnchor[anchor]);
  };

  if (specialists.length > 0) {
    // Один спеціаліст — картка, як і раніше; кілька — нумерований список
    // (перелік із двох-трьох карток поспіль читався як набір розрізнених
    // блоків і не показував, що це один список). Розмітка навмисно та сама,
    // що й у .rich-content ol, — звідти беруться кружечки з номерами
    // й готове оформлення для друку.
    const html =
      specialists.length === 1
        ? `
          <div class="stage">
            <div class="stage-h">
              <span class="stage-name">${escapeHtml(specialists[0].name)}</span>
            </div>
          </div>`
        : `
          <div class="rich-content spec-list">
            <ol>
              ${specialists.map((s) => `<li>${escapeHtml(s.name)}</li>`).join("")}
            </ol>
          </div>`;
    sectionBodies.push({ title: "Суміжні спеціалісти", html });
  }
  flushCategoriesFor("after_specialists");

  if (exams.length > 0) {
    const cards = exams
      .map((e) => {
        const content = parseStructuredContent(e.recommendation);
        return `
          <div class="exam">
            <div class="exam-body">${renderStructuredBody(content)}</div>
          </div>`;
      })
      .join("");
    sectionBodies.push({
      title: "Обстеження",
      html: cards + importantBlock(examsNote),
    });
  }
  flushCategoriesFor("after_exams");

  // Розділ «Засоби» вмикається одним прапорцем на всі формати експорту —
  // див. ../reportSectionFlags.
  if (INCLUDE_MEDICATIONS_SECTION && medications.length > 0) {
    const blocks = medications
      .map((m) => itemBlock(m.name, parseStructuredContent(m.recommendation)))
      .join("");
    sectionBodies.push({
      title: "Засоби",
      html: blocks + importantBlock(medicationsNote),
    });
  }
  flushCategoriesFor("after_medications");

  if (homeCares.length > 0) {
    // Групи беруться з назв категорій у самих вибраних засобах, а не з
    // поточного довідника: інакше засіб, чию категорію після збереження
    // звіту перейменували чи видалили, мовчки зникав би з листа. Порядок
    // груп — порядок додавання засобів у звіт.
    const uniqueCategories = Array.from(
      new Set(homeCares.map((h) => h.name?.trim()).filter(Boolean)),
    );

    const groups = uniqueCategories
      .map((category) => {
        const items = homeCares.filter((h) => h.name?.trim() === category);
        if (items.length === 0) return "";

        const rowHtml = (h: (typeof items)[number]): string => {
          const content = parseStructuredContent(h.recommendations);
          return `
            <div class="hc-row">
              <div class="hc-product">
                <div class="hc-name">${escapeHtml(h.medicationName || "—")}</div>
                ${renderStructuredBody(content, "Рекомендацію не знайдено")}
              </div>
              <div class="hc-check"><span class="chk ${h.morning ? "is-on" : ""}"></span></div>
              <div class="hc-check"><span class="chk ${h.evening ? "is-on" : ""}"></span></div>
              <div class="hc-price"><span class="line"></span></div>
            </div>`;
        };

        // Заголовок колонок і перший рядок навмисно в одному
        // break-inside: avoid блоці (.hc-intro) — щоб "ЗАСІБ/ДЕНЬ/ВЕЧІР…"
        // ніколи не лишався сам-один унизу сторінки без жодного товару під
        // ним. Наступні рядки вже можуть розбиватись вільно між собою.
        const [firstItem, ...restItems] = items;
        const restRows = restItems.map(rowHtml).join("");

        return `
          <div class="hc-category">
            <div class="hc-cat-h">${escapeHtml(category as string)}</div>
            <div class="hc-cat-b">
              <div class="hc-grid">
                <div class="hc-intro">
                  <div class="hc-head-row">
                    <span class="hc-product">Засіб</span>
                    <span class="hc-check">День</span>
                    <span class="hc-check">Вечір</span>
                    <span class="hc-price">Орієнтовна вартість</span>
                  </div>
                  ${rowHtml(firstItem)}
                </div>
                ${restRows}
              </div>
            </div>
          </div>`;
      })
      .join("");

    sectionBodies.push({
      title: "Домашній догляд",
      html: groups + importantBlock(homeCareNote),
    });
  }
  flushCategoriesFor("after_homecare");

  if (procedureStages.some((s) => s.procedures.length > 0)) {
    const stagesHtml = procedureStages
      .map((stage, i) => {
        if (!stage.procedures.length) return "";

        const proceduresHtml = stage.procedures
          .map((proc) => {
            const zone = proc.zoneEnabled && proc.zone ? proc.zone : "";
            const interval =
              proc.intervalEnabled && proc.interval ? proc.interval : "";
            const visitCount =
              proc.visitCountEnabled && proc.visitCount != null
                ? String(proc.visitCount)
                : "";

            return `
              <div class="proc-card">
                <div class="proc-top">
                  <span class="proc-name">${escapeHtml(proc.name)}</span>
                  <span class="proc-price"><span class="pl">Орієнтовна вартість</span><span class="line"></span></span>
                </div>
                ${
                  zone || interval || visitCount
                    ? `<div class="proc-tags">
                        ${zone ? `<span class="tag">Зона · <b>${escapeHtml(zone)}</b></span>` : ""}
                        ${interval ? `<span class="tag">Інтервал · <b>${escapeHtml(interval)}</b></span>` : ""}
                        ${visitCount ? `<span class="tag">Кількість візитів · <b>${escapeHtml(visitCount)}</b></span>` : ""}
                      </div>`
                    : ""
                }
                ${proc.comment?.trim() ? plainTextToHtml(proc.comment) : ""}
              </div>
            `;
          })
          .join("");

        const workWith =
          stage.workWithEnabled && stage.workWith?.trim()
            ? stage.workWith.trim()
            : "";

        return `
          <div class="stage">
            <div class="stage-h">
              <span class="stage-n">${i + 1}</span>
              <span class="stage-name">${escapeHtml(stage.title || `Етап ${i + 1}`)}${workWith ? ` — робота з ${escapeHtml(workWith)}` : ""}</span>
            </div>
            <div class="stage-b">${proceduresHtml}</div>
          </div>`;
      })
      .join("");

    sectionBodies.push({
      title: "Протокол процедур",
      html: stagesHtml + (procedures.length === 0 ? importantBlock(proceduresNote) : ""),
    });
  }
  flushCategoriesFor("after_procedure_stages");

  if (procedures.length > 0) {
    const blocks = procedures
      .map((p) => itemBlock(p.name, parseStructuredContent(p.recommendation)))
      .join("");
    // Обгортка потрібна, щоб на друку прибрати лінії саме між цими
    // картками: клас .item-block спільний із категоріями, і без окремого
    // контейнера правило зачепило б і їх.
    sectionBodies.push({
      title: "Рекомендації щодо процедур",
      html: `<div class="proc-recs">${blocks}</div>` + importantBlock(proceduresNote),
    });
  }
  flushCategoriesFor("after_procedures");

  if (additionalInfo?.trim()) {
    sectionBodies.push({
      title: "Все, що необхідно знати про ваш стан",
      html: plainTextToHtml(additionalInfo),
    });
  }

  if (comments?.trim()) {
    sectionBodies.push({
      title: "Додаткова інформація",
      html: plainTextToHtml(comments),
    });
  }

  const sectionsHtml = sectionBodies
    .map((section, index) => secWrap(index + 1, section.title, section.html))
    .join("\n");

  const today = new Date().toLocaleDateString("uk-UA");

  const styles = `
  @font-face {
    font-family: "Noah";
    src: url(data:font/truetype;base64,${noahRegularBase64}) format("truetype");
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: "Noah";
    src: url(data:font/truetype;base64,${noahBoldBase64}) format("truetype");
    font-weight: 700;
    font-style: normal;
  }

  :root {
    --ink: #2F311A;
    --olive: #3D4025;
    --sage: #6E6E6E;
    --sage-soft: #9A9A9A;
    --card: #F2F2F2;
    --line: #B8B8B8;
    --line-soft: #E0E0E0;
    --text: #262626;
    --muted: #707070;
    --danger: #404040;
    --accent: var(--olive);
    --accent-dark: var(--ink);
    --accent-soft: var(--secondary);
    --det-bg: #F7F7F7;
    --secondary: #DCDCDC;

    /* Висота рядка одним значенням: нею заданий line-height у body, і
       вона ж потрібна кружечкам нумерованих списків, щоб порахувати
       висоту рядка (CSS не дає послатись на неї напряму). Поки це були
       два окремі числа, вони мовчки розбігались. */
    --lh: 1.32;
  }

  * { box-sizing: border-box; }

  @page {
    size: A4;
    margin: 12mm 12mm 14mm;
  }

  body {
    margin: 0;
    font-family: "Noah", -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 11.5pt;
    line-height: var(--lh);
    color: var(--text);
    background: #E8E8E8;
  }

  .sheet {
    width: 210mm;
    max-width: 100%;
    margin: 24px auto;
    background: #fff;
    padding: 12mm 12mm 14mm;
    box-shadow: 0 18px 45px -20px rgba(26,26,26,.4);
  }

  .letterhead {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 8mm;
    padding-bottom: 3.5mm;
    border-bottom: 2px solid var(--ink);
    margin-bottom: 3.5mm;
    break-inside: avoid;
  }
  .lh-logo { width: 30mm; height: auto; display: block; }
  .lh-kind {
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: .2em;
    text-transform: uppercase;
    color: var(--ink);
    background: var(--secondary);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    padding: 2mm 3.5mm;
    border-radius: 1mm;
  }

  .meta {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid var(--line);
    margin-bottom: 4.5mm;
    break-inside: avoid;
  }
  .meta .cell { padding: 2mm 3.2mm; border-left: 1px solid var(--line); min-width: 0; }
  .meta .cell:first-child { border-left: none; }
  .meta .k {
    display: block;
    font-size: 6.5pt;
    font-weight: 700;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: .8mm;
  }
  .meta .v { font-weight: 700; color: var(--olive); font-size: 13pt; }

  .sec { margin-bottom: 5.5mm; }
  .sec-head {
    display: flex; align-items: baseline; gap: 3.5mm;
    margin-bottom: 3mm;
    background: var(--accent);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    border-radius: 1mm;
    padding: 2.4mm 4mm;
    break-after: avoid;
    break-inside: avoid;
  }
  .sec-num { font-size: 15pt; font-weight: 400; color: rgba(255,255,255,.65); line-height: 1; }
  .sec-title {
    margin: 0;
    font-size: 13.5pt; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
    color: #fff;
  }

  .sub-h {
    font-size: 10.5pt; font-weight: 700;
    color: var(--ink);
    margin: 2.4mm 0 1.2mm;
  }

  .exam { border: 1px solid var(--line); margin-bottom: 3mm; }
  .exam:last-child { margin-bottom: 0; }
  .exam-body { padding: 3mm 4mm 3.2mm; }

  .det {
    border: 1px solid var(--line-soft);
    background: var(--det-bg);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    padding: 2.4mm 3.5mm;
    margin: 1.6mm 0;
  }
  .kv { display: flex; align-items: baseline; gap: 3mm; padding-bottom: 1.3mm; break-inside: avoid; }
  .kv:last-child { padding-bottom: 0; }
  .kv .k {
    flex: none; width: 24mm;
    font-size: 7pt; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--sage);
  }
  .kv .v { flex: 1; margin: 0; }

  .det-box {
    border: 1px solid var(--line-soft);
    padding: 2.4mm 3.5mm;
    margin: 1.6mm 0;
    break-inside: avoid;
  }
  .det-t {
    font-size: 7.5pt; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink);
    margin-bottom: 1.5mm;
    break-after: avoid;
  }

  .det-box--warn {
    border: none;
    border-top: 1px dashed var(--line);
    border-radius: 0;
    padding: 2.4mm 0 0;
    margin: 2.4mm 0 0;
  }
  .det-box--warn .det-t { color: var(--danger); }
  .det-box--warn .rich-content ul,
  .det-box--warn .rich-content ol { list-style: none; padding-left: 0; margin: 0; }
  .det-box--warn .rich-content p,
  .det-box--warn .rich-content li {
    position: relative;
    padding-left: 5mm;
    margin: 0 0 1.2mm;
  }
  .det-box--warn .rich-content p:last-child,
  .det-box--warn .rich-content li:last-child { margin-bottom: 0; }
  .det-box--warn .rich-content p::before,
  .det-box--warn .rich-content li::before {
    content: "";
    position: absolute; left: .4mm; top: 1.6mm;
    width: 1.6mm; height: 1.6mm;
    background: var(--danger);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .det-box--warn .rich-content li::marker { content: ""; }

  .important {
    display: flex; align-items: baseline; gap: 3.5mm;
    margin: 2.4mm 0;
    border: 1px solid var(--accent);
    border-left: 1mm solid var(--accent);
    background: var(--accent-soft);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    padding: 2.4mm 3.5mm;
    break-inside: avoid;
  }
  .important .mark { font-size: 15pt; font-weight: 700; color: var(--accent-dark); line-height: 1; }
  .important .rich-content a { color: var(--ink); font-weight: 700; text-decoration: none; }

  .stage { border: 1px solid var(--line); margin-bottom: 3mm; }
  .stage:last-child { margin-bottom: 0; }
  .stage-h {
    display: flex; align-items: center; gap: 3mm;
    background: var(--accent-soft);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    border-bottom: 1px solid var(--line);
    padding: 2.2mm 4mm;
    break-after: avoid;
  }
  .stage-n {
    flex: none;
    width: 6.4mm; height: 6.4mm;
    background: var(--accent);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 9.5pt; color: #fff;
  }
  .stage-name { font-weight: 700; font-size: 12pt; color: var(--ink); }
  .stage-b { padding: 3mm 4mm 3.2mm; }

  .proc-card {
    border: 1px solid var(--line);
    border-left: 1mm solid var(--accent);
    padding: 2.4mm 4mm;
    margin-bottom: 2mm;
    break-inside: avoid;
  }
  .proc-card:last-child { margin-bottom: 0; }
  .proc-top {
    display: flex; flex-wrap: wrap; align-items: baseline;
    justify-content: space-between; gap: 3mm;
  }
  .proc-name { font-weight: 700; font-size: 12pt; color: var(--olive); }
  .proc-price { display: flex; align-items: baseline; gap: 2mm; flex: none; }
  .proc-price .pl {
    font-size: 6.5pt; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: var(--muted);
  }
  .proc-price .line { display: inline-block; width: 26mm; border-bottom: 1px dotted var(--sage-soft); height: .9em; }

  /* align-items: baseline, а не типовий stretch: мітка набрана дрібним
     капсом, а значення в <b> — більшим кеглем, тож без цього сусідні
     мітки вирівнюються по висоті блока й «пливуть» одна відносно одної. */
  .proc-tags {
    display: flex; flex-wrap: wrap; align-items: baseline;
    gap: 2mm; margin-top: 1.8mm;
  }
  .tag {
    display: inline-block;
    font-size: 6.5pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    color: var(--accent-dark);
    border: 1px solid var(--accent);
    border-radius: 3mm;
    padding: .8mm 3mm;
  }
  .tag b { color: var(--olive); text-transform: none; letter-spacing: 0; font-size: 8pt; }

  .proc-card .plain { margin-top: 1.8mm; color: var(--muted); }

  .hc-category { border: 1px solid var(--line); margin-bottom: 3mm; }
  .hc-category:last-child { margin-bottom: 0; }
  .hc-cat-h {
    border-bottom: 1px solid var(--line);
    background: var(--accent-soft);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    padding: 2.2mm 4mm;
    font-weight: 700; color: var(--ink); font-size: 12pt;
    break-after: avoid;
  }
  .hc-cat-b { padding: 3mm 4mm 3.2mm; }

  /* Раніше тут була справжня <table> — Chrome/Safari при друку вперто
     відмовляються розбивати HTML-таблиці між сторінками (навіть з
     border-collapse: separate і break-inside: avoid на <tr>), тому
     весь блок «стрибав» на наступну сторінку разом. Grid на div-ах
     фрагментується так само надійно, як і решта карток звіту. */
  .hc-grid { width: 100%; font-size: 9pt; }
  .hc-head-row,
  .hc-row {
    display: grid;
    grid-template-columns: 1fr 12mm 12mm 32mm;
    column-gap: 2.5mm;
    align-items: start;
  }
  .hc-head-row {
    font-size: 6.5pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    color: var(--muted);
    padding-bottom: 1.6mm;
    border-bottom: 1.5px solid var(--ink);
    break-after: avoid;
  }
  .hc-head-row .hc-check, .hc-row .hc-check { text-align: center; }
  .hc-intro { break-inside: avoid; }
  .hc-row {
    padding: 3.5mm 0 1.8mm;
    border-bottom: 1px solid var(--line-soft);
    break-inside: avoid;
  }
  /* Розділювач потрібен лише МІЖ товарами — під останнім у категорії
     він дублює рамку .hc-category. Останнім рядком може бути або
     звичайний .hc-row, або (коли товар у категорії один) той, що
     лишився всередині .hc-intro разом із шапкою колонок. */
  .hc-grid > .hc-row:last-child,
  .hc-grid > .hc-intro:last-child .hc-row { border-bottom: none; }
  .hc-name { font-weight: 700; color: var(--olive); font-size: 12pt; margin-bottom: 1mm; }
  .hc-price .line { display: inline-block; width: 20mm; border-bottom: 1px dotted var(--sage-soft); height: .9em; }
  .chk { display: inline-block; width: 3.2mm; height: 3.2mm; border: 1.4px solid var(--ink); background: #fff; }
  .chk.is-on { background: var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* .item-block--plain — та сама картка без заголовка (категорія з
     вимкненим показом назви). Оформлення успадковує від .item-block,
     окремий клас потрібен, щоб такі блоки можна було стилізувати
     незалежно від іменованих. */
  .item-block { border: 1px solid var(--line); margin-bottom: 3mm; }
  .item-block:last-child { margin-bottom: 0; }
  .item-name {
    border-bottom: 1px solid var(--line);
    background: var(--accent-soft);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    padding: 2.2mm 4mm;
    font-weight: 700; color: var(--ink); font-size: 12pt;
    break-after: avoid;
  }
  .item-body { padding: 3mm 4mm 3.2mm; }

  .plain { white-space: pre-wrap; margin: 0; font-size: 11.5pt; }

  .rich-content { margin: 0; font-size: 11.5pt; }
  .rich-content h1, .rich-content h2, .rich-content h3 { font-size: 1.05em; font-weight: 700; margin: 0.5em 0 0.25em; }
  .rich-content p { margin: 0.15em 0; }
  .rich-content p:first-child { margin-top: 0; }
  .rich-content p:last-child { margin-bottom: 0; }
  .rich-content ul { list-style: disc; padding-left: 1.3em; margin: 0.25em 0; }
  .rich-content ul li { break-inside: avoid; margin-bottom: 1mm; }
  .rich-content ul li::marker { color: var(--accent); font-weight: 700; }

  .rich-content ol {
    list-style: none;
    padding-left: 0;
    margin: 0.25em 0;
    counter-reset: step;
  }
  .rich-content ol li {
    position: relative;
    padding-left: 8mm;
    margin-bottom: 1.4mm;
    counter-increment: step;
    --ol-fs: 11.5pt;
    font-size: var(--ol-fs);
    break-inside: avoid;
  }
  .rich-content ol li:last-child { margin-bottom: 0; }
  .rich-content ol li::before {
    content: counter(step);
    position: absolute; left: 0;

    /* Кружечок центрується по ПЕРШОМУ рядку тексту: пів рядка вниз, пів
       кружечка вгору. Обидві величини, від яких це залежить, мають одне
       джерело — --num-size тут і --lh у :root (той самий, яким заданий
       line-height у body), тож розбігтися вони більше не можуть.

       Чому саме так, а не простіше:
       • top: 50% рахується від висоти всього <li> — у пункті на два
         рядки номер поїхав би в середину абзацу;
       • вирівнювання флексом по базовій лінії ставить центр кружечка на
         висоту «базова лінія + пів цифри», тобто на ~0.45mm нижче
         оптичного центру рядка. */
    --num-size: 4.6mm;
    top: calc((var(--ol-fs) * var(--lh) - var(--num-size)) / 2);
    width: var(--num-size); height: var(--num-size);

    background: var(--accent);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 6.5pt; font-weight: 700; color: #fff;
  }

  /* Список суміжних спеціалістів: та сама механіка, що й у нумерованих
     списках рекомендацій, але кегль і накреслення — як у назви спеціаліста
     в картці (.stage-name), щоб перехід «одна картка → список» не змінював
     вагу тексту. --ol-fs мусить дорівнювати font-size: від нього
     рахується зміщення кружечка з номером. */
  .spec-list ol li {
    --ol-fs: 12pt;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 1.8mm;
  }

  .rich-content hr { border: none; border-top: 1px solid var(--line-soft); margin: 0.5em 0; }
  .rich-content strong, b { font-weight: 700; color: var(--ink); }
  .rich-content a { color: var(--ink); font-weight: 700; text-decoration: underline; }

  .bottom { display: flex; gap: 4mm; break-inside: avoid; margin-top: 3mm; }
  .contact {
    flex: 1.6;
    border: 1px solid var(--line);
    border-left: 1mm solid var(--ink);
    padding: 3mm 4mm;
    font-size: 9pt;
    white-space: pre-wrap;
  }
  .sig {
    flex: 1;
    border: 1px solid var(--line);
    padding: 3mm 4mm;
    display: flex; flex-direction: column; justify-content: flex-start;
  }
  .sig .k {
    font-size: 7.5pt; font-weight: 700; letter-spacing: .18em;
    text-transform: uppercase; color: var(--muted);
    margin-bottom: 1.5mm;
  }
  .sig .name { font-weight: 700; color: var(--olive); font-size: 13pt; }

  @media print {
    /* На екрані світло-сірі підписи (--muted/--sage) та тонкі лінії
       (--line/--line-soft) читаються нормально завдяки кольору фону,
       але на чорно-білому друку/ксерокопії втрачають контраст і майже
       зникають — тут ці змінні перевизначено темнішими лише для друку. */
    :root {
      --muted: #3D3D3D;
      --sage: #3D3D3D;
      --sage-soft: #707070;
      --line: #8C8C8C;
      --line-soft: #ACACAC;
    }

    body { background: #fff; }
     /* Правий бордер рамок (.item-block, .exam, .stage тощо) торкався
       правого краю друкованої області впритул — Chrome при друку іноді
       відкидає останній піксель бордера, що впирається точно в межу
       сторінки (заокруглення mm→px). Невеликий відступ справа зсуває
       рамки трохи всередину, і бордер більше не «зникає». */
    .sheet { width: auto; max-width: none; margin: 0; padding: 0 0.6mm 0 0; box-shadow: none; }
    p, li { orphans: 3; widows: 3; }

    /* Чорно-білий друк/ксерокопія: суцільна темна заливка з білим текстом
       на таких пристроях часто губить контраст і витрачає багато тонера —
       для друку замінюємо на контур + темний текст. */
    .sec-head {
      background: none;
      border: none;
    }
    .sec-num { color: var(--muted); }
    .sec-title { color: var(--ink); }

    .stage-n {
      background: none;
      border: 1.6px solid var(--ink);
      color: var(--ink);
    }

    /* Кільце навмисно в мм, а не 1px: на колі 2.6–3mm піксельний бордер
       зʼїдав понад пʼяту частину діаметра, тиснув цифру й на екранному
       прев'ю рвався в еліпс (на десяток пікселів немає з чого малювати
       рівне коло). 0.15mm на 600 dpi — це ~3.5 точки, друкується чисто. */
    .rich-content ol li::before {
      background: none;
      border: .15mm solid var(--ink);
      color: var(--ink);
    }

    .lh-kind,
    .det,
    .important,
    .stage-h,
    .hc-cat-h,
    .item-name {
      background: none;
    }


    /* ——— Оформлення для друку ———————————————————————————
       Взято з еталонного листа: жодних рамок, плашок і заливок —
       структуру тримають тонкі лінії-роздільники, дрібні капсові
       мітки та різниця кеглів. Рамка кожної картки зʼїдає 2–3 мм
       по периметру й перетворює аркуш на «сітку з коробок», тому
       на друку її замінено лінією зверху блоку. Кольори лишаються
       ті самі, що й на екрані. */

    /* 1. Шапка: логотип + назва листа, під ними лінія; далі
       «Пацієнт | Дата» у дві колонки з вертикальним роздільником
       і замикальною лінією знизу — замість рамки-таблиці. */
    .letterhead {
      align-items: center;
      padding-bottom: 2.5mm;
      margin-bottom: 0;
      border-bottom: 1px solid var(--line);
    }
    .lh-logo { width: 18mm; }
    .lh-kind {
      font-size: 7.5pt;
      letter-spacing: .22em;
      padding: 0;
      border-radius: 0;
    }
    .meta {
      grid-template-columns: 1fr 1fr;
      border: none;
      border-bottom: 1px solid var(--line);
      margin-bottom: 4.5mm;
    }
    .meta .cell {
      padding: 2.2mm 0 2.2mm 6mm;
      border-left: 1px solid var(--line-soft);
    }
    .meta .cell:first-child { padding-left: 0; }
    .meta .k { font-size: 6pt; margin-bottom: .6mm; }
    .meta .v { font-size: 11pt; }

    /* 2. Відступи між секціями та між заголовком і тілом секції.
       Відступ між секціями лишається помітно більшим за внутрішній
       (4.5 проти 1.6 мм) — інакше заголовок «прилипає» до попередньої
       секції і межа між розділами зчитується гірше. */
    .sec { margin-bottom: 4.5mm; }
    .sec-head {
      gap: 2.5mm;
      margin-bottom: 1.6mm;
      padding: 0;
    }
    .sub-h { margin: 1.6mm 0 .8mm; }

    /* Ієрархія розмірів при друку. Кроки навмисно великі (1–1.5pt):
       з різницею 0.5pt рівні зливаються в суцільну сіру масу.
         назва секції        12pt   (великі літери, розрядка)
         назва групи/етапу   10.5pt
         назва засобу/процедури 9.5pt
         підзаголовок        9pt
         текст рекомендацій  8.5pt  (звичайне накреслення)
         блок «важливо»      7.5pt
         технічні мітки      6.5pt  (ЗАСІБ, ЗОНА, ОРІЄНТОВНА ВАРТІСТЬ)
       На екрані розміри лишаються попередніми. */
    .sec-num { font-size: 12pt; }
    .sec-title { font-size: 12pt; letter-spacing: .1em; }
    .stage-name, .item-name, .hc-cat-h { font-size: 11pt; }
    .hc-name, .proc-name { font-size: 11pt; }
    .sub-h { font-size: 10pt; }
    .plain, .rich-content, .hc-grid { font-size: 9pt; }
    .tag b { font-size: 7pt; }
    .stage-n { width: 5.4mm; height: 5.4mm; font-size: 9pt; }

    /* Пропорція цифри до кола має лишатися такою ж, як на екрані, де
       все виглядає правильно: там цифра займає близько третини
       внутрішнього діаметра. На друку кільце ще й зʼїдає частину
       простору, тож рахувати треба від внутрішнього діаметра:
         кільце 0.15mm × 2  → внутрішній діаметр 3 − 0.3 = 2.7mm
         цифра 4pt          → висота знака 0.68 × 4pt = 0.96mm
         0.96 / 2.7         = 36%   (на екрані 34% — збігається)
       Попередня пара 2.6mm + 4.5pt давала 52%: цифра тиснулась у кільце,
       і будь-який зсув у частку міліметра ліз у вічі. */
    .rich-content ol li {
      --ol-fs: 8pt;
      padding-left: 5.4mm;
      margin-bottom: 1mm;
    }
    .rich-content ol li::before {
      --num-size: 2.5mm;
      font-size: 4pt;
    }

    /* Спеціалісти лишаються помітнішими за текст рекомендацій, але вже
       не на рівні назв секцій-етапів (11pt було завелико поряд зі
       зменшеними списками). Правило мусить стояти після
       .rich-content ol li вище — специфічність однакова, вирішує
       порядок. */
    .spec-list ol li { --ol-fs: 9.5pt; margin-bottom: 1.2mm; }

    /* На друку заголовок секції втрачає плашку, тож роль роздільника
       бере на себе лінія зверху першого блока (див. .item-block, .stage
       нижче). Список спеціалістів такого блока не має — лінія потрібна
       на самому .spec-list, інакше секція «Суміжні спеціалісти»
       залишається єдиною без відбивки під назвою. */
    .spec-list {
      border-top: 1px solid var(--line-soft);
      padding-top: 1.8mm;
    }
    .spec-list ol { margin: 0; }

    /* Обстеження, категорії домашнього догляду та блоки «мітка —
       текст» лишаються в рамках, як і було, — без рамок тільки те,
       що прямо перелічено нижче (засоби, спеціалісти, етапи процедур). */
    .exam, .hc-category { margin-bottom: 2mm; }
    .exam-body, .hc-cat-b { padding: 2mm 3mm 2.2mm; }
    .hc-cat-h { padding: 1.4mm 3mm; }
    .det, .det-box { margin: 1.2mm 0; padding: 1.8mm 3mm; }

    /* Блок «Не можна» відбитий від попереднього тексту не рамкою, а
       пунктирною лінією зверху — з загальним для .det-box відступом
       1.2mm вона майже торкалася тексту вище і читалась як частина
       того ж абзацу. Правило мусить стояти після .det, .det-box —
       специфічність однакова, вирішує порядок. */
    .det-box--warn { margin-top: 3mm; }

    /* 3. Секція засобів і назви спеціалістів — без рамок: роздільник
       між сусідніми блоками це тонка лінія зверху, тож жирнішої лінії
       під назвою спеціаліста більше немає. Внутрішні падінги обнулено,
       щоб текст ішов від лівого поля рівно під заголовком секції. */
    .item-block, .stage {
      border: none;
      border-top: 1px solid var(--line-soft);
      margin-bottom: 0;
      padding-top: 1.8mm;
    }
    /* «Рекомендації щодо процедур» читаються як суцільний перелік, тож
       ліній між картками там немає — сусідні відбиваються тільки
       відступом. Лінію першої картки лишаємо: на друку саме вона
       відбиває секцію від заголовка (плашки-заголовка тут немає). */
    .proc-recs .item-block + .item-block { border-top: none; }

    .item-name, .stage-h {
      border-bottom: none;
      padding: 0 0 1.2mm;
    }
    .item-body, .stage-b { padding: 0 0 2.2mm; }

    /* 4. Протокол процедур: назва процедури й «орієнтовна вартість» в
       один рядок, теги (Зона · Інтервал) — пігулки під назвою,
       процедури розділені пунктирною лінією.
       padding-bottom тут — це відбивка від тексту процедури до
       пунктиру під нею, margin-bottom — від пунктиру до наступної
       процедури. Вони навмисно різні: над лінією стоїть рядок
       пігулок, і при однакових відступах пунктир «прилипав» до нього. */
    .stage-b { padding: 0; }
    .proc-card {
      border: none;
      border-bottom: 1px dashed var(--line-soft);
      padding: 0 0 2.8mm;
      margin-bottom: 1.6mm;
    }
    .proc-card:last-child {
      border-bottom: none;
      padding-bottom: 0;
      margin-bottom: 0;
    }
    .proc-tags { gap: 3mm; margin-top: 1.8mm; }

    /* Обведено тільки значення: мітка (ЗОНА, ІНТЕРВАЛ) лишається голим
       дрібним капсом, а в пігулку взято те, що читач шукає очима.
       display: inline-block обовʼязковий — у звичайного інлайнового <b>
       вертикальні падінги не збільшують рядковий бокс, і рамка налазила
       б на назву процедури зверху. */
    .tag { border: none; border-radius: 0; padding: 0; }
    .tag b {
      display: inline-block;
      border: 1px solid var(--accent);
      border-radius: 2.5mm;
      padding: .4mm 2.2mm;
    }

    /* 5. Блоки «важливо»: без рамки й акцентної смуги — лише знак «!»
       і дрібний текст під тонкою лінією. Змінну --ol-fs теж треба
       перевизначити: нумеровані списки рахують від неї і розмір
       шрифту, і зміщення кружечка з номером. */
    .important {
      border: none;
      border-top: 1px solid var(--line-soft);
      gap: 1.8mm;
      margin: 1.8mm 0 0;
      padding: 1.5mm 0 0;
    }
    .important .mark { font-size: 8pt; }
    .important .plain,
    .important .rich-content { font-size: 7pt; }
    .important .rich-content ol li { --ol-fs: 7pt; }

    /* 6. Нотатка та лікар лишаються в рамках; притискаються до низу
       аркуша завдяки тому, що .sheet стає flex-колонкою заввишки
       щонайменше зі сторінку, а margin-top: auto віддає підпису весь
       вільний простір, що лишився знизу. */
    .sheet {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .bottom {
      margin-top: auto;
      padding-top: 3mm;
      gap: 3mm;
    }
    .contact { padding: 2mm 3mm; font-size: 7.5pt; }
    .sig { padding: 2mm 3mm; }
    .sig .k { font-size: 6pt; margin-bottom: .8mm; }
    .sig .name { font-size: 9.5pt; }
  }

  @media screen and (max-width: 760px) {
    .sheet { width: auto; margin: 0; padding: 6mm 5mm; box-shadow: none; }
    .meta { grid-template-columns: 1fr; }
    .meta .cell { border-left: none; border-top: 1px solid var(--line); }
    .meta .cell:first-child { border-top: none; }
    .bottom { flex-direction: column; }
  }
`;

  const bodyHtml = `
  <header class="letterhead">
    ${logoDataUrl ? `<img class="lh-logo" src="${logoDataUrl}" alt="Логотип" />` : "<span></span>"}
    <div class="lh-kind">Рекомендаційний лист</div>
  </header>

  <div class="meta">
    <div class="cell"><span class="k">Пацієнт</span><span class="v">${escapeHtml(patient.fullName || "")}</span></div>
    <div class="cell"><span class="k">Дата</span><span class="v">${today}</span></div>
  </div>

  ${sectionsHtml}`;

  const footerHtml = `
  <div class="bottom">
    <div class="contact">${finalNote?.trim() ? escapeHtml(finalNote.trim()) : ""}</div>
    <div class="sig">
      <div class="k">Лікар</div>
      <div class="name">${escapeHtml(doctorName?.trim() || "—")}</div>
    </div>
  </div>`;

  const html = `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8" />
<title>Рекомендаційний лист — ${escapeHtml(patient.fullName || "")}</title>
<style>${styles}</style>
</head>
<body>
<div class="sheet">
${bodyHtml}
${footerHtml}
</div>
</body>
</html>`;

  const fileName = `Рекомендаційний_лист_${
    patient.fullName?.replace(/\s+/g, "_") ?? "Пацієнт"
  }.html`;

  const blob = new Blob([html], { type: "text/html" });
  const result = await saveHtmlBlob(fileName, blob, directoryHandle);

  if (result.status === "saved-to-folder") {
    toast.success("HTML-файл збережено у обрану папку.");
  } else if (result.reason === "write-failed") {
    toast.error(
      "Не вдалося записати HTML-файл у вибрану папку (можливо, файл із такою назвою зараз відкритий в іншій програмі). Файл завантажено звичайним способом.",
    );
  } else if (result.reason === "permission-denied") {
    toast.error(
      "Немає дозволу на запис у вибрану папку. Файл завантажено звичайним способом.",
    );
  } else {
    toast.success("HTML-файл завантажено у папку «Завантаження».");
  }
};
