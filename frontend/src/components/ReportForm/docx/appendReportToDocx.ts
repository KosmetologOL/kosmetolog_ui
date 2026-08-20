import JSZip from "jszip";
import toast from "react-hot-toast";
import { downloadBlob } from "#lib/htmlSaveLocation";
import type { GenerateReportHtmlParams } from "../html/generateReportHtml";
import { buildAppendParagraphsXml } from "./buildDocxFragment";
import { DocxStructureError, insertParagraphsBeforeFinalSectPr } from "./spliceDocumentXml";

export type AppendDocxResult =
  | { status: "appended" }
  | { status: "failed"; reason: "read-failed" | "invalid-structure" | "write-failed" };

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const appendReportToDocx = async (
  params: GenerateReportHtmlParams,
  handle: FileSystemFileHandle,
): Promise<AppendDocxResult> => {
  let file: File;
  try {
    file = await handle.getFile();
  } catch (err) {
    console.error("Не вдалося прочитати файл картки пацієнта:", err);
    toast.error(
      "Не вдалося прочитати файл картки пацієнта. Перевірте, чи файл не переміщено або видалено.",
    );
    return { status: "failed", reason: "read-failed" };
  }

  let zip: JSZip;
  let documentXml: string;
  try {
    zip = await JSZip.loadAsync(file);
    const documentEntry = zip.file("word/document.xml");
    if (!documentEntry) {
      throw new DocxStructureError("word/document.xml відсутній у файлі.");
    }
    documentXml = await documentEntry.async("string");
  } catch (err) {
    console.error("Не вдалося розпізнати структуру .docx файлу:", err);
    toast.error(
      "Не вдалося розпізнати структуру .docx файлу картки пацієнта. Перевірте, що це коректний файл Word.",
    );
    return { status: "failed", reason: "invalid-structure" };
  }

  try {
    const paragraphsXml = await buildAppendParagraphsXml(params);
    const updatedXml = insertParagraphsBeforeFinalSectPr(
      documentXml,
      paragraphsXml,
    );
    zip.file("word/document.xml", updatedXml);

    const blob = await zip.generateAsync({
      type: "blob",
      mimeType: DOCX_MIME,
    });

    // Резервна копія ДО перезапису: jszip пересеріалізує весь архів, і
    // попередньої версії картки в клієнта більше нізвідки взяти.
    downloadBlob(`${handle.name}.bak`, file);

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();

    toast.success(
      `Звіт додано в кінець файлу «${handle.name}». Попередню версію збережено в «Завантаження» як «${handle.name}.bak».`,
    );
    return { status: "appended" };
  } catch (err) {
    if (err instanceof DocxStructureError) {
      console.error("Пошкоджена структура .docx файлу:", err);
      toast.error(
        "Не вдалося розпізнати структуру .docx файлу картки пацієнта. Перевірте, що це коректний файл Word.",
      );
      return { status: "failed", reason: "invalid-structure" };
    }
    console.error("Не вдалося записати дані у файл картки пацієнта:", err);
    toast.error(
      "Не вдалося записати дані у файл картки (можливо, він зараз відкритий у Word). Закрийте файл і спробуйте ще раз.",
    );
    return { status: "failed", reason: "write-failed" };
  }
};
