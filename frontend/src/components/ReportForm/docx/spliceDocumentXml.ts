export class DocxStructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocxStructureError";
  }
}

// Негативний lookahead відсікає `<w:sectPrChange`, залишаючи лише сам `<w:sectPr>`.
const SECT_PR_OPEN_RE = /<w:sectPr(?![A-Za-z])/g;
const BODY_OPEN_RE = /<w:body[\s>]/;
const BODY_CLOSE_TAG = "</w:body>";

// Останнє текстове входження `<w:sectPr` у word/document.xml завжди відповідає
// body-рівневому <w:sectPr> — розриви секцій усередині документа вкладені
// в <w:pPr> попередніх параграфів і завжди йдуть раніше в тексті файлу.
export const insertParagraphsBeforeFinalSectPr = (
  documentXml: string,
  paragraphsXml: string,
): string => {
  if (!BODY_OPEN_RE.test(documentXml) || !documentXml.includes(BODY_CLOSE_TAG)) {
    throw new DocxStructureError(
      "word/document.xml не містить очікуваної структури <w:body>.",
    );
  }

  let lastSectPrIndex = -1;
  for (const match of documentXml.matchAll(SECT_PR_OPEN_RE)) {
    if (typeof match.index === "number") lastSectPrIndex = match.index;
  }

  const insertAt =
    lastSectPrIndex !== -1
      ? lastSectPrIndex
      : documentXml.lastIndexOf(BODY_CLOSE_TAG);

  return (
    documentXml.slice(0, insertAt) +
    paragraphsXml +
    documentXml.slice(insertAt)
  );
};
