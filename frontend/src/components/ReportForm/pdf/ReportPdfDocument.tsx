// PDF-версія рекомендаційного листа.
//
// Порядок секцій і всі правила відображення повторюють generateReportHtml —
// це навмисна копія, бо HTML-звіт лишається робочим і чіпати його не можна.
// Дані, які там дочитуються всередині функції (категорії, повний список
// категорій домашнього догляду), тут приходять готовими пропами: рендер у
// @react-pdf/renderer синхронний, всередині компонентів запитів не зробиш.

import type { ICategory, CategoryReportPosition } from "#api/referenceApi";
import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import React from "react";
import type {
  GenerateReportHtmlParams,
  IProcedureStage,
} from "../html/generateReportHtml";
import {
  parseStructuredContent,
  type StructuredContent,
} from "../html/structuredContent";
import { pdfText } from "./pdfText";
import RichText, { NumberedRow } from "./RichText";
import { groupHomeCaresByCategory } from "../homeCareGroups";
import { FONT, FOOTER_RESERVE, styles } from "./reportPdfStyles";

export interface ReportPdfProps {
  params: Omit<GenerateReportHtmlParams, "directoryHandle">;
  categoriesMeta: ICategory[];
  logoSrc: string;
}

/** Тіло структурованої рекомендації: вступ, пари «мітка — значення»,
 *  блоки, підзаголовки та виноски «важливо». */
const StructuredBody: React.FC<{
  content: StructuredContent;
  fallback?: string;
}> = ({ content, fallback = "—" }) => {
  if (content.isEmpty) return <Text style={styles.body}>{fallback}</Text>;

  return (
    <>
      {content.intro ? <RichText html={content.intro} /> : null}

      {content.kv.length > 0 && (
        <View style={styles.det}>
          {content.kv.map((row, i) => (
            <View key={i} style={styles.kvRow} wrap={false}>
              <View style={styles.kvKeyWrap}>
                <Text style={styles.kvKey}>{row.label}</Text>
              </View>
              <View style={styles.kvValue}>
                <RichText html={row.html} />
              </View>
            </View>
          ))}
        </View>
      )}

      {content.boxes.map((box, i) => {
        const warn = box.variant === "warn";
        return (
          <View
            key={i}
            style={warn ? [styles.detBox, styles.detBoxWarn] : styles.detBox}
            wrap={false}
          >
            <Text style={warn ? [styles.detTitle, styles.detTitleWarn] : styles.detTitle}>
              {box.label}
            </Text>
            <RichText html={box.html} bullet={warn ? "square" : "disc"} />
          </View>
        );
      })}

      {content.sections.map((section, i) => (
        <View key={i}>
          <Text style={styles.subHeading}>{section.heading}</Text>
          <RichText html={section.html} />
        </View>
      ))}

      {content.callouts.map((callout, i) => (
        <Important key={i} html={callout} />
      ))}
    </>
  );
};

const Important: React.FC<{ html?: string; text?: string }> = ({
  html,
  text,
}) => {
  const trimmed = text?.trim();
  if (!html && !trimmed) return null;
  return (
    <View style={styles.important} wrap={false}>
      <Text style={styles.importantMark}>!</Text>
      <View style={styles.importantBody}>
        {html ? (
          // Виноска — єдине місце, де текст іде не в кеглі body: разом із
          // абзацами дрібнішають і списки всередині неї, бо RichText веде
          // весь свій вміст одним кеглем.
          <RichText html={html} size={FONT.important} />
        ) : (
          <Text style={styles.importantText}>{pdfText(trimmed as string)}</Text>
        )}
      </View>
    </View>
  );
};

/** Блок однієї рекомендації. `first`/`last` вмикають суцільні межі
 *  переліку — всередині нього лінії пунктирні, див. styles.itemBlock. */
const ItemBlock: React.FC<{
  name?: string;
  content: StructuredContent;
  first?: boolean;
  last?: boolean;
}> = ({ name, content, first, last }) => {
  // Розгортання, а не push: масив із push звузився б до типу першого
  // елемента, і решта стилів у нього вже не влізла б.
  const style = [
    styles.itemBlock,
    ...(first ? [styles.itemBlockFirst] : []),
    ...(last ? [styles.itemBlockLast] : []),
  ];

  return (
    <View style={style}>
      {name ? <Text style={styles.itemName}>{pdfText(name)}</Text> : null}
      <StructuredBody content={content} />
    </View>
  );
};

const pad2 = (n: number): string => String(n).padStart(2, "0");

const Section: React.FC<{
  index: number;
  title: string;
  children: React.ReactNode;
}> = ({ index, title, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHead} wrap={false}>
      <Text style={styles.sectionNum}>{pad2(index)}</Text>
      <Text style={styles.sectionTitle}>{pdfText(title)}</Text>
    </View>
    {children}
  </View>
);

/** Один рядок таблиці процедур. Порожній рядок означає, що значення не
 *  задане, — саме за цим вирішується, чи взагалі малювати колонку. */
interface ProcRow {
  name: string;
  zone: string;
  interval: string;
  visits: string;
  comment: string;
}

type ProcColumnKey = Exclude<keyof ProcRow, "comment">;

/** Колонки в порядку зліва направо. «Процедура» є завжди, решта — лише
 *  якщо хоч в однієї процедури етапу є значення. Колонка з місцем під
 *  ціну сюди не входить: вона фіксованої ширини й малюється окремо. */
const PROC_COLUMNS: { key: ProcColumnKey; label: string }[] = [
  { key: "name", label: "Процедура" },
  { key: "zone", label: "Зона" },
  { key: "interval", label: "Інтервал" },
  { key: "visits", label: "Візити" },
];

/**
 * Ширина знака відносно кегля. Капс із розрядкою ширший за рядковий текст,
 * тож коефіцієнти різні. Точність тут не критична: числа йдуть не в width,
 * а в пропорцію між колонками — див. columnWeight.
 */
const CAPS_RATIO = 0.66;
const TEXT_RATIO = 0.56;

const measure = (
  text: string,
  size: number,
  ratio: number,
  tracking = 0,
): number => text.length * (size * ratio + tracking);

/**
 * «Вага» колонки — оцінка ширини її найдовшого рядка в пунктах.
 *
 * Справжню ширину тексту до рендера рушій не дає: метрики шрифту доступні
 * лише всередині layout. Тому ширина рахується оцінкою й іде у flexGrow
 * при flexBasis: 0 — колонки ділять доступну ширину В ПРОПОРЦІЇ до вмісту.
 * Через це похибка оцінки не може переповнити рядок: сума часток завжди
 * дорівнює ширині таблиці, а неточність зміщує межу колонки на пару
 * міліметрів, не більше.
 *
 * Шапка враховується нарівні зі значеннями: колонка «Візити» з однією
 * цифрою все одно мусить вмістити слово ВІЗИТИ.
 */
const columnWeight = (
  key: ProcColumnKey,
  label: string,
  rows: ProcRow[],
): number =>
  Math.max(
    measure(label, FONT.micro, CAPS_RATIO, 0.8),
    ...rows.map((row) =>
      measure(row[key], key === "name" ? FONT.item : FONT.body, TEXT_RATIO),
    ),
  );

/**
 * Назва етапу без номера в кінці.
 *
 * Номер уже стоїть у кружечку зліва, а в даних назва майже завжди йде
 * разом із ним — форма створює етапи як «Етап 1», «Етап 2» (див.
 * CreateReportForm), — і в листі число друкувалося двічі поспіль:
 * «① ЕТАП 1». Власна назва без числа («Підготовчий») лишається як є.
 */
const stageTitle = (title: string | undefined): string =>
  title?.replace(/\s*\d+\s*$/, "").trim() || "Етап";

const ProcedureStages: React.FC<{ stages: IProcedureStage[] }> = ({
  stages,
}) => (
  <>
    {stages.map((stage, stageIndex) => {
      if (stage.procedures.length === 0) return null;
      const workWith =
        stage.workWithEnabled && stage.workWith?.trim()
          ? ` — робота з ${stage.workWith.trim()}`
          : "";

      const rows: ProcRow[] = stage.procedures.map((proc) => ({
        name: pdfText(proc.name),
        zone: proc.zoneEnabled && proc.zone ? pdfText(proc.zone) : "",
        interval:
          proc.intervalEnabled && proc.interval ? pdfText(proc.interval) : "",
        visits:
          proc.visitCountEnabled && proc.visitCount != null
            ? String(proc.visitCount)
            : "",
        comment: proc.comment?.trim() ? pdfText(proc.comment.trim()) : "",
      }));

      const columns = PROC_COLUMNS.filter(
        (col) => col.key === "name" || rows.some((row) => row[col.key]),
      );
      const weights = columns.map((col) =>
        columnWeight(col.key, col.label, rows),
      );

      return (
        <View key={stageIndex} style={styles.stage}>
          <View style={styles.stageHead} wrap={false}>
            <View style={styles.stageNum}>
              <Text style={styles.stageNumText}>{stageIndex + 1}</Text>
            </View>
            <Text style={styles.stageName}>
              {pdfText(stageTitle(stage.title) + workWith)}
            </Text>
          </View>

          <View style={styles.procTable}>
            <View style={styles.procHeadRow} wrap={false}>
              {columns.map((col, ci) => (
                <Text
                  key={col.key}
                  style={[
                    styles.procHeadCell,
                    styles.procCellGap,
                    { flexGrow: weights[ci], flexBasis: 0 },
                  ]}
                >
                  {col.label}
                </Text>
              ))}
              <Text style={[styles.procHeadCell, styles.procPriceCell]}>
                Орієнтовна вартість
              </Text>
            </View>

            {rows.map((row, i) => (
              <View
                key={i}
                style={[
                  styles.procRow,
                  ...(i === 0 ? [styles.procRowFirst] : []),
                  ...(i === rows.length - 1 ? [styles.procRowLast] : []),
                ]}
                wrap={false}
              >
                <View style={styles.procRowCells}>
                  {columns.map((col, ci) => (
                    <Text
                      key={col.key}
                      style={[
                        col.key === "name" ? styles.procName : styles.procCell,
                        styles.procCellGap,
                        { flexGrow: weights[ci], flexBasis: 0 },
                      ]}
                    >
                      {row[col.key] || "—"}
                    </Text>
                  ))}
                  <View style={styles.procPriceCell} />
                </View>

                {row.comment ? (
                  <Text style={styles.procComment}>{row.comment}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      );
    })}
  </>
);

const ReportPdfDocument: React.FC<ReportPdfProps> = ({
  params,
  categoriesMeta,
  logoSrc,
}) => {
  const {
    patient,
    exams,
    procedures,
    procedureStages = [],
    specialists,
    homeCares,
    categoryItems = [],
    additionalInfo,
    comments,
    finalNote,
    homeCareNote,
    examsNote,
    proceduresNote,
    doctorName,
  } = params;

  const today = new Date().toLocaleDateString("uk-UA");
  const sections: { title: string; body: React.ReactNode }[] = [];

  // Категорії розкладаються по «якорях» — так само, як у HTML-звіті.
  const byAnchor: Record<CategoryReportPosition, React.ReactNode[]> = {
    after_specialists: [],
    after_exams: [],
    after_medications: [],
    after_homecare: [],
    after_procedure_stages: [],
    after_procedures: [],
  };
  const anchorTitles: Record<CategoryReportPosition, string[]> = {
    after_specialists: [],
    after_exams: [],
    after_medications: [],
    after_homecare: [],
    after_procedure_stages: [],
    after_procedures: [],
  };

  Array.from(
    new Set(categoryItems.map((c) => c.categoryName?.trim()).filter(Boolean)),
  ).forEach((categoryName) => {
    const items = categoryItems.filter((c) => c.categoryName === categoryName);
    if (items.length === 0) return;

    const meta =
      categoriesMeta.find((cat) => cat._id === items[0].categoryId) ??
      categoriesMeta.find((cat) => cat.name === categoryName);
    const showName = meta?.showNameInReport ?? true;
    const anchor = meta?.reportPosition ?? "after_homecare";

    byAnchor[anchor].push(
      <View key={String(categoryName)}>
        {items.map((item, i) => (
          <ItemBlock
            key={i}
            first={i === 0}
            last={i === items.length - 1}
            name={showName ? item.itemName : undefined}
            content={parseStructuredContent(item.recommendation)}
          />
        ))}
        <Important text={meta?.importantNote} />
      </View>,
    );
    anchorTitles[anchor].push(String(categoryName));
  });

  const flush = (anchor: CategoryReportPosition) => {
    byAnchor[anchor].forEach((body, i) => {
      sections.push({ title: anchorTitles[anchor][i], body });
    });
  };

  if (specialists.length > 0) {
    sections.push({
      title: "Суміжні спеціалісти",
      // Один спеціаліст — картка, кілька — нумерований перелік: так само,
      // як у HTML-звіті. Перелік набирається не через RichText: імена
      // приходять готовим масивом, і заганяти їх у <ol>, щоб одразу
      // розібрати назад, немає сенсу — до того ж тут свій кегль і
      // накреслення (.spec-list на друці).
      body:
        specialists.length === 1 ? (
          // Обгортка та сама, що й у переліку з кількох спеціалістів
          // (specList), а не stage: етапи лінію під заголовком секції
          // втратили, а спеціалісти мусять виглядати однаково незалежно
          // від того, один їх чи кілька.
          <View style={styles.specList}>
            <View style={styles.stageHead}>
              <Text style={styles.stageNamePlain}>
                {pdfText(specialists[0].name)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.specList}>
            {specialists.map((s, i) => (
              <NumberedRow
                key={i}
                index={i + 1}
                size={FONT.item}
                gap="0.8mm"
              >
                <Text style={styles.specName}>{pdfText(s.name)}</Text>
              </NumberedRow>
            ))}
          </View>
        ),
    });
  }
  flush("after_specialists");

  if (exams.length > 0) {
    sections.push({
      title: "Обстеження",
      body: (
        <>
          {/* Обстеження навмисно без wrap={false}: у друкованому CSS у
              .exam немає break-inside: avoid, а рекомендація буває на
              півсторінки — заборона розриву гнала б її на новий аркуш і
              лишала діру. */}
          {exams.map((exam, i) => (
            <View key={i} style={styles.exam}>
              <StructuredBody
                content={parseStructuredContent(exam.recommendation)}
              />
            </View>
          ))}
          <Important text={examsNote} />
        </>
      ),
    });
  }
  flush("after_exams");

  // «Засоби» вимкнені й у HTML-звіті — клієнт просив поки не включати.
  flush("after_medications");

  if (homeCares.length > 0) {
    sections.push({
      title: "Домашній догляд",
      body: (
        <>
          {groupHomeCaresByCategory(homeCares).map(({ category, items }) => {
            return (
              <View key={category} style={styles.hcCategory}>
                <Text style={styles.hcCategoryHead}>{pdfText(category)}</Text>
                <View style={styles.hcCategoryBody}>
                  <View style={styles.hcHeadRow} wrap={false}>
                    <Text style={[styles.hcProduct, styles.hcHeadCell]}>
                      Засіб
                    </Text>
                    <Text style={[styles.hcCheck, styles.hcHeadCell]}>День</Text>
                    <Text style={[styles.hcCheck, styles.hcHeadCell]}>
                      Вечір
                    </Text>
                    <Text style={[styles.hcPrice, styles.hcHeadCell]}>
                      Орієнтовна вартість
                    </Text>
                  </View>

                  {items.map((item, i) => (
                    <View
                      key={i}
                      style={
                        i === items.length - 1
                          ? [styles.hcRow, styles.hcRowLast]
                          : styles.hcRow
                      }
                      wrap={false}
                    >
                      <View style={styles.hcProduct}>
                        <Text style={styles.hcName}>
                          {pdfText(item.medicationName || "—")}
                        </Text>
                        <StructuredBody
                          content={parseStructuredContent(item.recommendations)}
                          fallback="Рекомендацію не знайдено"
                        />
                      </View>
                      <View style={styles.hcCheck}>
                        <View
                          style={
                            item.morning
                              ? [styles.checkbox, styles.checkboxOn]
                              : styles.checkbox
                          }
                        />
                      </View>
                      <View style={styles.hcCheck}>
                        <View
                          style={
                            item.evening
                              ? [styles.checkbox, styles.checkboxOn]
                              : styles.checkbox
                          }
                        />
                      </View>
                      <View style={styles.hcPrice}>
                        <View style={styles.priceLine} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
          <Important text={homeCareNote} />
        </>
      ),
    });
  }
  flush("after_homecare");

  if (procedureStages.some((s) => s.procedures.length > 0)) {
    sections.push({
      title: "Протокол процедур",
      body: (
        <>
          <ProcedureStages stages={procedureStages} />
          {procedures.length === 0 ? <Important text={proceduresNote} /> : null}
        </>
      ),
    });
  }
  flush("after_procedure_stages");

  if (procedures.length > 0) {
    sections.push({
      title: "Рекомендації щодо процедур",
      body: (
        <>
          {procedures.map((proc, i) => (
            <ItemBlock
              key={i}
              first={i === 0}
              last={i === procedures.length - 1}
              name={proc.name}
              content={parseStructuredContent(proc.recommendation)}
            />
          ))}
          <Important text={proceduresNote} />
        </>
      ),
    });
  }
  flush("after_procedures");

  if (additionalInfo?.trim()) {
    sections.push({
      title: "Все, що необхідно знати про ваш стан",
      body: <Text style={styles.body}>{pdfText(additionalInfo.trim())}</Text>,
    });
  }

  if (comments?.trim()) {
    sections.push({
      title: "Додаткова інформація",
      body: <Text style={styles.body}>{pdfText(comments.trim())}</Text>,
    });
  }

  return (
    <Document title={`Рекомендаційний лист — ${patient.fullName || ""}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.letterhead}>
          {logoSrc ? <Image style={styles.logo} src={logoSrc} /> : <View />}
          <Text style={styles.letterheadKind}>Рекомендаційний лист</Text>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCell}>
            <Text style={styles.metaKey}>Пацієнт</Text>
            <Text style={styles.metaValue}>
              {pdfText(patient.fullName || "")}
            </Text>
          </View>
          <View style={[styles.metaCell, styles.metaCellRight]}>
            <Text style={styles.metaKey}>Дата</Text>
            <Text style={styles.metaValue}>{today}</Text>
          </View>
        </View>

        {sections.map((section, i) => (
          <Section key={i} index={i + 1} title={section.title}>
            {section.body}
          </Section>
        ))}

        {/* Розпірка під підвал. Підвал позиціонований абсолютно, тобто
            місця в потоці не займає — без цієї розпірки текст останньої
            сторінки заліз би під нього. Резервує смугу тільки в кінці
            документа, а не на кожному аркуші. */}
        <View style={{ height: FOOTER_RESERVE }} />

        {/* Підвал малюється лише на останній сторінці: fixed повторює блок
            на кожному аркуші, а render дає номер сторінки, тож на решті
            повертаємо порожньо.

            Приведення типу потрібне через неповні d.ts: у типах render для
            View оголошено тільки { pageNumber, subPageNumber }, хоча рушій
            передає й totalPages усім динамічним вузлам однаково — див.
            resolvePageIndices у @react-pdf/layout. */}
        <View
          fixed
          style={styles.footer}
          render={(props) => {
            const { pageNumber, totalPages } = props as unknown as {
              pageNumber: number;
              totalPages: number;
            };
            return pageNumber === totalPages ? (
              <>
                <Text style={styles.footerNote}>
                  {pdfText(finalNote?.trim() || "")}
                </Text>
                <View style={styles.footerSig}>
                  <Text style={styles.footerSigKey}>Лікар</Text>
                  <Text style={styles.footerSigName}>
                    {pdfText(doctorName?.trim() || "—")}
                  </Text>
                </View>
              </>
            ) : null;
          }}
        />
      </Page>
    </Document>
  );
};

export default ReportPdfDocument;
