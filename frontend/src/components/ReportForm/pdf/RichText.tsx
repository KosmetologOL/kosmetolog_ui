// HTML-фрагмент → компоненти @react-pdf/renderer.
//
// parseStructuredContent віддає рекомендації вже готовою розміткою (абзаци,
// жирний, курсив, посилання, списки) — у HTML-звіті вона просто вставляється
// в документ. PDF-рушій розмітки не розуміє взагалі: у нього є лише View,
// Text і Link, а текст обовʼязково має лежати всередині Text. Тому фрагмент
// розбирається браузерним DOMParser і перекладається вручну.
//
// Свідомі обмеження: підтримані ті теги, які реально народжує markdownToHtml
// (p, strong/b, em/i, a, ul/ol/li, br, h1-h3, hr). Усе інше рендериться як
// звичайний текст — краще показати без оформлення, ніж загубити.

import { Link, Text, View } from "@react-pdf/renderer";
import React from "react";
import { pdfText } from "./pdfText";
import { COLORS, FONT, LINE_HEIGHT_RATIO, lh } from "./reportPdfStyles";

interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
}

/** Кружечок із номером: 2.2mm при відступі 4.2mm. Розміри взяті з
 *  друкованого CSS (.rich-content ol li::before у @media print) і
 *  стиснуті разом з рештою відступів листа. */
const MARKER_SIZE_MM = 2.2;
const MARKER_INDENT = "4.2mm";
const PT_PER_MM = 72 / 25.4;

/** Зсув маркера вниз, щоб він став по центру ПЕРШОГО рядка пункту, а не
 *  по центру всього пункту: у пункті на два рядки номер поїхав би в
 *  середину абзацу. Та сама арифметика, що й top: calc(…) на друці. */
const markerOffset = (size: number, markerMm: number): number =>
  Math.max(0, (size * LINE_HEIGHT_RATIO - markerMm * PT_PER_MM) / 2);

const parseFragment = (html: string): HTMLElement | null => {
  if (!html?.trim()) return null;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  return doc.body.firstElementChild as HTMLElement | null;
};

const inline = (
  node: ChildNode,
  style: InlineStyle,
  key: string,
): React.ReactNode => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = pdfText(node.textContent ?? "");
    if (!text) return null;
    return (
      <Text
        key={key}
        style={{
          fontWeight: style.bold ? 700 : 400,
          fontStyle: style.italic ? "italic" : "normal",
          color: style.bold ? COLORS.ink : undefined,
        }}
      >
        {text}
      </Text>
    );
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === "br") return <Text key={key}>{"\n"}</Text>;

  const next: InlineStyle =
    tag === "strong" || tag === "b"
      ? { ...style, bold: true }
      : tag === "em" || tag === "i"
        ? { ...style, italic: true }
        : style;

  const children = Array.from(el.childNodes).map((child, i) =>
    inline(child, next, `${key}-${i}`),
  );

  if (tag === "a") {
    const href = el.getAttribute("href") || "";
    return (
      <Link
        key={key}
        src={href}
        style={{ color: COLORS.ink, fontWeight: 700, textDecoration: "underline" }}
      >
        {children}
      </Link>
    );
  }

  return <React.Fragment key={key}>{children}</React.Fragment>;
};

const inlineChildren = (el: HTMLElement, key: string): React.ReactNode[] =>
  Array.from(el.childNodes).map((child, i) => inline(child, {}, `${key}-${i}`));

/** Маркер списку і текст пункту в один рядок. Ширина маркера фіксована,
 *  інакше пункти не вирівняються між собою по лівому краю тексту. */
const listItem = (
  marker: React.ReactNode,
  content: React.ReactNode,
  key: string,
  markerWidth: string,
  size: number,
  gap: string,
): React.ReactNode => (
  <View
    key={key}
    style={{ flexDirection: "row", marginBottom: gap }}
    wrap={false}
  >
    <View style={{ width: markerWidth, flexShrink: 0 }}>{marker}</View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: size, lineHeight: lh(size) }}>{content}</Text>
    </View>
  </View>
);

/**
 * Пункт нумерованого списку — кружечок із номером плюс довільний вміст.
 *
 * Винесено назовні, бо тим самим переліком набирається секція «Суміжні
 * спеціалісти»: у HTML-звіті вона свідомо користується розміткою
 * .rich-content ol, тільки з більшим кеглем (.spec-list).
 */
export const NumberedRow: React.FC<{
  index: number;
  size: number;
  gap?: string;
  children: React.ReactNode;
}> = ({ index, size, gap = "0.7mm", children }) => (
  <View style={{ flexDirection: "row", marginBottom: gap }} wrap={false}>
    <View style={{ width: MARKER_INDENT, flexShrink: 0 }}>
      {/* Кружечок із номером. Тут, на відміну від браузера, центрування
          передбачуване: Yoga центрує текст у коробці фіксованого розміру
          без залежності від метрик шрифту. */}
      <View
        style={{
          width: `${MARKER_SIZE_MM}mm`,
          height: `${MARKER_SIZE_MM}mm`,
          borderWidth: 0.43,
          borderColor: COLORS.ink,
          borderRadius: `${MARKER_SIZE_MM / 2}mm`,
          alignItems: "center",
          justifyContent: "center",
          marginTop: markerOffset(size, MARKER_SIZE_MM),
        }}
      >
        <Text style={{ fontSize: 4, fontWeight: 700, color: COLORS.ink }}>
          {index}
        </Text>
      </View>
    </View>
    <View style={{ flex: 1 }}>{children}</View>
  </View>
);

type Bullet = "disc" | "square";

/** Квадратик 1.4mm — маркер пунктів у блоці «Не можна»
 *  (.det-box--warn li::before). */
const SQUARE_SIZE_MM = 1.4;

const bulletMarker = (bullet: Bullet, size: number): React.ReactNode =>
  bullet === "square" ? (
    <View
      style={{
        width: `${SQUARE_SIZE_MM}mm`,
        height: `${SQUARE_SIZE_MM}mm`,
        backgroundColor: COLORS.danger,
        marginTop: markerOffset(size, SQUARE_SIZE_MM),
      }}
    />
  ) : (
    <Text
      style={{
        fontSize: size,
        lineHeight: lh(size),
        color: COLORS.olive,
        fontWeight: 700,
      }}
    >
      •
    </Text>
  );

const block = (
  el: HTMLElement,
  key: string,
  size: number,
  listSize: number,
  bullet: Bullet,
): React.ReactNode => {
  const tag = el.tagName.toLowerCase();

  if (tag === "ul") {
    return (
      <View key={key} style={{ marginVertical: "0.7mm" }}>
        {Array.from(el.children).map((li, i) =>
          listItem(
            bulletMarker(bullet, listSize),
            inlineChildren(li as HTMLElement, `${key}-${i}`),
            `${key}-${i}`,
            bullet === "square" ? "3.8mm" : "2.6mm",
            listSize,
            "0.7mm",
          ),
        )}
      </View>
    );
  }

  if (tag === "ol") {
    return (
      <View key={key} style={{ marginVertical: "0.7mm" }}>
        {Array.from(el.children).map((li, i) => (
          <NumberedRow key={`${key}-${i}`} index={i + 1} size={listSize}>
            <Text style={{ fontSize: listSize, lineHeight: lh(listSize) }}>
              {inlineChildren(li as HTMLElement, `${key}-${i}`)}
            </Text>
          </NumberedRow>
        ))}
      </View>
    );
  }

  if (tag === "hr") {
    return (
      <View
        key={key}
        style={{
          borderTopWidth: 0.4,
          borderTopColor: COLORS.lineSoft,
          marginVertical: "0.8mm",
        }}
      />
    );
  }

  if (tag === "h1" || tag === "h2" || tag === "h3") {
    return (
      <Text
        key={key}
        style={{
          fontSize: FONT.subHeading,
          lineHeight: lh(FONT.subHeading),
          fontWeight: 700,
          color: COLORS.ink,
          marginTop: "1mm",
          marginBottom: "0.5mm",
        }}
      >
        {inlineChildren(el, key)}
      </Text>
    );
  }

  return (
    <Text
      key={key}
      style={{ fontSize: size, lineHeight: lh(size), marginBottom: "0.4mm" }}
    >
      {inlineChildren(el, key)}
    </Text>
  );
};

interface Props {
  html: string;
  /** Показати замість порожнього фрагмента (наприклад «Рекомендацію не знайдено»). */
  fallback?: string;
  /** Кегль абзаців у пунктах. */
  size?: number;
  /** Маркер невпорядкованого списку. У блоці «Не можна» це квадратик. */
  bullet?: Bullet;
}

const RichText: React.FC<Props> = ({
  html,
  fallback,
  size = FONT.body,
  bullet = "disc",
}) => {
  // Пункт списку набраний тим самим кеглем, що й абзац навколо нього. На
  // друці він був на крок дрібніший (--ol-fs: 8pt проти 9pt), і саме через
  // це текст однієї рекомендації розпадався на два розміри — див. правило
  // «увесь текст рекомендації одного кегля» в FONT.
  const listSize = size;
  const root = parseFragment(html);
  const children = root ? Array.from(root.children) : [];

  if (children.length === 0) {
    // Фрагмент без блокових тегів — трапляється, коли рекомендація це один
    // рядок тексту. Виводимо як абзац.
    const text = pdfText(root?.textContent?.trim() || fallback || "");
    return text ? (
      <Text style={{ fontSize: size, lineHeight: lh(size) }}>{text}</Text>
    ) : null;
  }

  return (
    <>
      {children.map((el, i) =>
        block(el as HTMLElement, `b${i}`, size, listSize, bullet),
      )}
    </>
  );
};

export default RichText;
