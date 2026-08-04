import type { IExam } from "#api/examsApi";
import type { IHomeCare } from "#api/homeCaresApi";
import { getAllHomeCares } from "#api/homeCaresApi";
import type { IMedication } from "#api/medicationsApi";
import type { IPatient } from "#api/patientsApi";
import type { IProcedure } from "#api/proceduresApi";
import { getCategories, type CategoryReportPosition } from "#api/referenceApi";
import type { ISpecialist } from "#api/specialistsApi";
import type { IReportCategoryItem } from "#components/Categories/SearchCategories";
import logoUrl from "#assets/logo.png";
import NoahBoldTTFUrl from "#fonts/Noah-Bold.ttf";
import NoahTTFUrl from "#fonts/Noah-Regular.ttf";
import { toast } from "react-hot-toast/headless";
import { saveHtmlBlob } from "../../../lib/htmlSaveLocation";
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
            : `<div class="exam"><div class="exam-body">${renderStructuredBody(content)}</div></div>`;
        })
        .join("");

      categorySectionsByAnchor[anchor].push({
        title: categoryName as string,
        html: blocks,
      });
    }
  }

  const flushCategoriesFor = (anchor: CategoryReportPosition) => {
    sectionBodies.push(...categorySectionsByAnchor[anchor]);
  };

  if (specialists.length > 0) {
    const cards = specialists
      .map(
        (s) => `
          <div class="stage">
            <div class="stage-h">
              <span class="stage-name">${escapeHtml(s.name)}</span>
            </div>
          </div>`,
      )
      .join("");
    sectionBodies.push({ title: "Суміжні спеціалісти", html: cards });
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

  if (medications.length > 0) {
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
    const allCares = await getAllHomeCares();
    const uniqueCategories = Array.from(
      new Set(allCares.map((c) => c.name?.trim()).filter(Boolean)),
    );

    const groups = uniqueCategories
      .map((category) => {
        const items = homeCares.filter((h) => h.name === category);
        if (items.length === 0) return "";

        const rows = items
          .map((h) => {
            const content = parseStructuredContent(h.recommendations);
            return `
            <tr>
              <td class="hc-product">
                <div class="hc-name">${escapeHtml(h.medicationName || "—")}</div>
                ${renderStructuredBody(content, "Рекомендацію не знайдено")}
              </td>
              <td class="hc-check"><span class="chk ${h.morning ? "is-on" : ""}"></span></td>
              <td class="hc-check"><span class="chk ${h.evening ? "is-on" : ""}"></span></td>
              <td class="hc-price"><span class="line"></span></td>
            </tr>`;
          })
          .join("");

        return `
          <div class="hc-category">
            <div class="hc-cat-h">${escapeHtml(category as string)}</div>
            <div class="hc-cat-b">
              <table class="hc-table">
                <thead>
                  <tr>
                    <th class="hc-product">Засіб</th>
                    <th class="hc-check">День</th>
                    <th class="hc-check">Вечір</th>
                    <th class="hc-price">Орієнтовна вартість</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
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
                        ${zone ? `<span class="tag">Зона · ${escapeHtml(zone)}</span>` : ""}
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
    sectionBodies.push({
      title: "Рекомендації щодо процедур",
      html: blocks + importantBlock(proceduresNote),
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

  const html = `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8" />
<title>Рекомендаційний лист — ${escapeHtml(patient.fullName || "")}</title>
<style>
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
    --sage: #83875F;
    --sage-soft: #A9AC8B;
    --card: #F4F2E7;
    --line: #C9C6B2;
    --line-soft: #E2E0D0;
    --text: #3A3C2C;
    --muted: #6F715A;
    --danger: #8A5A3B;
  }

  * { box-sizing: border-box; }

  @page {
    size: A4;
    margin: 12mm 12mm 14mm;
  }

  body {
    margin: 0;
    font-family: "Noah", -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: var(--text);
    background: #E3E1D2;
  }

  .sheet {
    width: 210mm;
    max-width: 100%;
    margin: 24px auto;
    background: #fff;
    padding: 12mm 12mm 14mm;
    box-shadow: 0 18px 45px -20px rgba(47,49,26,.4);
  }

  .letterhead {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 8mm;
    padding-bottom: 5mm;
    border-bottom: 2px solid var(--ink);
    margin-bottom: 5mm;
    break-inside: avoid;
  }
  .lh-logo { width: 30mm; height: auto; display: block; }
  .lh-kind {
    font-size: 11pt;
    font-weight: 700;
    letter-spacing: .2em;
    text-transform: uppercase;
    color: var(--ink);
  }

  .meta {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid var(--line);
    margin-bottom: 6mm;
    break-inside: avoid;
  }
  .meta .cell { padding: 2.6mm 3.2mm; border-left: 1px solid var(--line); min-width: 0; }
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
  .meta .v { font-weight: 700; color: var(--olive); font-size: 10.5pt; }

  .sec { margin-bottom: 7mm; }
  .sec-head {
    display: flex; align-items: baseline; gap: 3.5mm;
    margin-bottom: 4mm;
    break-after: avoid;
  }
  .sec-num { font-size: 15pt; font-weight: 400; color: var(--sage); line-height: 1; }
  .sec-title {
    margin: 0;
    font-size: 13.5pt; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
    color: var(--olive);
  }

  .sub-h {
    font-size: 9.5pt; font-weight: 700;
    color: var(--ink);
    margin: 3mm 0 1.6mm;
  }

  .exam { border: 1px solid var(--line); margin-bottom: 4mm; break-inside: avoid; }
  .exam:last-child { margin-bottom: 0; }
  .exam-body { padding: 3.5mm 4mm 4mm; }

  .det {
    border: 1px solid var(--line-soft);
    background: #FAF9F2;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    padding: 3mm 3.5mm;
    margin: 2mm 0;
    break-inside: avoid;
  }
  .kv { display: flex; gap: 3mm; padding-bottom: 1.8mm; break-inside: avoid; }
  .kv:last-child { padding-bottom: 0; }
  .kv .k {
    flex: none; width: 24mm;
    font-size: 7pt; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--sage);
    padding-top: .5mm;
  }
  .kv .v { flex: 1; margin: 0; font-size: 9pt; }

  .det-box {
    border: 1px solid var(--line-soft);
    padding: 3mm 3.5mm;
    margin: 2mm 0;
    break-inside: avoid;
  }
  .det-t {
    font-size: 7.5pt; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink);
    margin-bottom: 2mm;
    break-after: avoid;
  }

  .det-box--warn {
    border: none;
    border-top: 1px dashed var(--line);
    border-radius: 0;
    padding: 3mm 0 0;
    margin: 3mm 0 0;
  }
  .det-box--warn .det-t { color: var(--danger); }
  .det-box--warn .rich-content ul,
  .det-box--warn .rich-content ol { list-style: none; padding-left: 0; margin: 0; }
  .det-box--warn .rich-content p,
  .det-box--warn .rich-content li {
    position: relative;
    padding-left: 5mm;
    margin: 0 0 1.2mm;
    font-size: 9pt;
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
    display: flex; gap: 3.5mm;
    margin: 3mm 0;
    border: 1px solid var(--line);
    border-left: 1mm solid var(--sage);
    background: var(--card);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    padding: 3mm 3.5mm;
    font-size: 8.5pt;
    break-inside: avoid;
  }
  .important .mark { font-size: 15pt; font-weight: 700; color: var(--sage); line-height: 1; }
  .important .rich-content a { color: var(--ink); font-weight: 700; text-decoration: none; }

  .stage { border: 1px solid var(--line); margin-bottom: 4mm; break-inside: avoid; }
  .stage:last-child { margin-bottom: 0; }
  .stage-h {
    display: flex; align-items: center; gap: 3mm;
    background: var(--card);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    border-bottom: 1px solid var(--line);
    padding: 2.6mm 4mm;
    break-after: avoid;
  }
  .stage-n {
    flex: none;
    width: 6.4mm; height: 6.4mm;
    border: 1.6px solid var(--ink); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 9.5pt; color: var(--ink);
  }
  .stage-name { font-weight: 700; font-size: 11pt; color: var(--ink); }
  .stage-b { padding: 3.5mm 4mm 4mm; }

  .proc-card {
    border: 1px solid var(--line);
    border-left: 1mm solid var(--sage);
    padding: 3mm 4mm;
    margin-bottom: 2.5mm;
    break-inside: avoid;
  }
  .proc-card:last-child { margin-bottom: 0; }
  .proc-top {
    display: flex; flex-wrap: wrap; align-items: baseline;
    justify-content: space-between; gap: 3mm;
  }
  .proc-name { font-weight: 700; font-size: 10.5pt; color: var(--olive); }
  .proc-price { display: flex; align-items: baseline; gap: 2mm; flex: none; }
  .proc-price .pl {
    font-size: 6.5pt; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: var(--muted);
  }
  .proc-price .line { display: inline-block; width: 26mm; border-bottom: 1px dotted var(--sage-soft); height: .9em; }

  .proc-tags { display: flex; flex-wrap: wrap; gap: 2mm; margin-top: 2.4mm; }
  .tag {
    display: inline-block;
    font-size: 6.5pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    color: var(--sage);
    border: 1px solid var(--sage-soft);
    border-radius: 3mm;
    padding: .8mm 3mm;
  }
  .tag b { color: var(--olive); text-transform: none; letter-spacing: 0; font-size: 8pt; }

  .proc-card .plain { margin-top: 2.4mm; font-size: 8.5pt; color: var(--muted); }

  .hc-category { border: 1px solid var(--line); margin-bottom: 4mm; break-inside: avoid; }
  .hc-category:last-child { margin-bottom: 0; }
  .hc-cat-h {
    border-bottom: 1px solid var(--line);
    background: var(--card);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    padding: 2.6mm 4mm;
    font-weight: 700; color: var(--ink); font-size: 10.5pt;
    break-after: avoid;
  }
  .hc-cat-b { padding: 3.5mm 4mm 4mm; }

  table.hc-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .hc-table th {
    text-align: left;
    font-size: 6.5pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    color: var(--muted);
    padding: 0 2.5mm 1.6mm 0;
    border-bottom: 1.5px solid var(--ink);
  }
  .hc-table th.hc-check, .hc-table td.hc-check { text-align: center; width: 12mm; }
  .hc-table th.hc-price { white-space: nowrap; width: 1%; }
  .hc-table td { padding: 5mm 2.5mm 2.2mm 0; border-bottom: 1px solid var(--line-soft); vertical-align: top; }
  .hc-table tr { break-inside: avoid; }
  .hc-table tr:last-child td { border-bottom: none; }
  .hc-name { font-weight: 700; color: var(--olive); margin-bottom: 1mm; }
  .hc-price .line { display: inline-block; width: 20mm; border-bottom: 1px dotted var(--sage-soft); height: .9em; }
  .chk { display: inline-block; width: 3.2mm; height: 3.2mm; border: 1.4px solid var(--ink); background: #fff; }
  .chk.is-on { background: var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .item-block { border: 1px solid var(--line); margin-bottom: 4mm; break-inside: avoid; }
  .item-block:last-child { margin-bottom: 0; }
  .item-name {
    border-bottom: 1px solid var(--line);
    background: var(--card);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    padding: 2.6mm 4mm;
    font-weight: 700; color: var(--ink); font-size: 10.5pt;
    break-after: avoid;
  }
  .item-body { padding: 3.5mm 4mm 4mm; }

  .plain { white-space: pre-wrap; margin: 0; }

  .rich-content { margin: 0; }
  .rich-content h1, .rich-content h2, .rich-content h3 { font-size: 1.05em; font-weight: 700; margin: 0.6em 0 0.3em; }
  .rich-content p { margin: 0.5em 0; }
  .rich-content p:first-child { margin-top: 0; }
  .rich-content p:last-child { margin-bottom: 0; }
  .rich-content ul { list-style: disc; padding-left: 1.3em; margin: 0.3em 0; }
  .rich-content ul li { break-inside: avoid; margin-bottom: 1.2mm; }
  .rich-content ul li::marker { color: var(--sage); font-weight: 700; }

  .rich-content ol {
    list-style: none;
    padding-left: 0;
    margin: 0.3em 0;
    counter-reset: step;
  }
  .rich-content ol li {
    position: relative;
    padding-left: 8mm;
    margin-bottom: 1.8mm;
    counter-increment: step;
    font-size: 9.5pt;
    break-inside: avoid;
  }
  .rich-content ol li:last-child { margin-bottom: 0; }
  .rich-content ol li::before {
    content: counter(step);
    position: absolute; left: 0; top: .4mm;
    width: 4.6mm; height: 4.6mm;
    border: 1px solid var(--sage-soft);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 6.5pt; font-weight: 700; color: var(--sage);
  }

  .rich-content hr { border: none; border-top: 1px solid var(--line-soft); margin: 0.6em 0; }
  .rich-content strong, b { font-weight: 700; color: var(--ink); }
  .rich-content a { color: var(--ink); font-weight: 700; text-decoration: underline; }

  .bottom { display: flex; gap: 4mm; break-inside: avoid; margin-top: 4mm; }
  .contact {
    flex: 1.6;
    border: 1px solid var(--line);
    border-left: 1mm solid var(--ink);
    padding: 3.5mm 4mm;
    font-size: 9pt;
    white-space: pre-wrap;
  }
  .sig {
    flex: 1;
    border: 1px solid var(--line);
    padding: 3.5mm 4mm;
    display: flex; flex-direction: column; justify-content: flex-start;
  }
  .sig .k {
    font-size: 7.5pt; font-weight: 700; letter-spacing: .18em;
    text-transform: uppercase; color: var(--muted);
    margin-bottom: 1.5mm;
  }
  .sig .name { font-weight: 700; color: var(--olive); font-size: 13pt; }

  @media print {
    body { background: #fff; }
    .sheet { width: auto; max-width: none; margin: 0; padding: 0; box-shadow: none; }
    p, li { orphans: 3; widows: 3; }
  }

  @media screen and (max-width: 760px) {
    .sheet { width: auto; margin: 0; padding: 6mm 5mm; box-shadow: none; }
    .meta { grid-template-columns: 1fr; }
    .meta .cell { border-left: none; border-top: 1px solid var(--line); }
    .meta .cell:first-child { border-top: none; }
    .bottom { flex-direction: column; }
  }
</style>
</head>
<body>
<div class="sheet">

  <header class="letterhead">
    ${logoDataUrl ? `<img class="lh-logo" src="${logoDataUrl}" alt="Логотип" />` : "<span></span>"}
    <div class="lh-kind">Рекомендаційний лист</div>
  </header>

  <div class="meta">
    <div class="cell"><span class="k">Пацієнт</span><span class="v">${escapeHtml(patient.fullName || "")}</span></div>
    <div class="cell"><span class="k">Дата</span><span class="v">${today}</span></div>
  </div>

  ${sectionsHtml}

  <div class="bottom">
    <div class="contact">${finalNote?.trim() ? escapeHtml(finalNote.trim()) : ""}</div>
    <div class="sig">
      <div class="k">Лікар</div>
      <div class="name">${escapeHtml(doctorName?.trim() || "—")}</div>
    </div>
  </div>

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
  }
};
