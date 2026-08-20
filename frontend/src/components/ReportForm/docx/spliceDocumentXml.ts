export class DocxStructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocxStructureError";
  }
}

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const parseXml = (xml: string): Document => {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new DocxStructureError(
      "word/document.xml не вдалося розпарсити як XML.",
    );
  }
  return doc;
};

// Точку вставки визначаємо через DOM: body-рівневий <w:sectPr> — це пряма
// дитина <w:body>. Рядковий пошук тут хибний, бо `<w:sectPrChange>` усередині
// нього стоїть у тексті пізніше, а сам body-рівневий sectPr за ECMA-376
// взагалі необовʼязковий.
export const insertParagraphsBeforeFinalSectPr = (
  documentXml: string,
  paragraphsXml: string,
): string => {
  const doc = parseXml(documentXml);

  const body = doc.getElementsByTagNameNS(W_NS, "body")[0];
  if (!body) {
    throw new DocxStructureError(
      "word/document.xml не містить очікуваної структури <w:body>.",
    );
  }

  // Фрагмент параграфів використовує лише префікс `w:`, тож парсимо його
  // з обгорткою, яка оголошує цей неймспейс.
  const fragmentDoc = parseXml(
    `<w:fragment xmlns:w="${W_NS}">${paragraphsXml}</w:fragment>`,
  );

  const sectPr =
    Array.from(body.children).find(
      (el) => el.namespaceURI === W_NS && el.localName === "sectPr",
    ) ?? null;

  // При sectPr === null insertBefore працює як appendChild — кейс документа
  // без body-рівневого <w:sectPr> покрито.
  Array.from(fragmentDoc.documentElement.childNodes).forEach((node) => {
    body.insertBefore(doc.importNode(node, true), sectPr);
  });

  const serialized = new XMLSerializer().serializeToString(doc);

  // XMLSerializer у браузері не відтворює XML-декларацію — зберігаємо оригінальну.
  const declaration = documentXml.match(/^<\?xml[^>]*\?>\s*/)?.[0] ?? "";
  return serialized.startsWith("<?xml") ? serialized : declaration + serialized;
};
