// Точка входу PDF-експорту. HTML-експорт лишається окремо й недоторканим —
// це другий, паралельний вихід із тих самих даних.

import { getAllHomeCares } from "#api/homeCaresApi";
import { getCategories } from "#api/referenceApi";
import logoUrl from "#assets/logo.png";
import { saveHtmlBlob } from "#lib/htmlSaveLocation";
import { safeFileName } from "#lib/safeFileName";
import { pdf } from "@react-pdf/renderer";
import { toast } from "react-hot-toast";
import type { GenerateReportHtmlParams } from "../html/generateReportHtml";
import ReportPdfDocument from "./ReportPdfDocument";
import { registerReportFonts } from "./reportPdfStyles";

/**
 * Логотип у чорному варіанті.
 *
 * У файлі він фірмовий оливковий силует на прозорому тлі — єдиний колір,
 * що лишався в листі після переходу на чорно-білу палітру (див. COLORS).
 * Перефарбувати картинку стилями @react-pdf не вміє, тож робимо це до
 * рендера: малюємо на полотні й заливаємо чорним у режимі source-in, який
 * зачіпає лише непрозорі пікселі, а отже лишає форму знака недоторканою.
 *
 * Якщо полотно чомусь не спрацює — повертаємо оригінал: оливковий
 * логотип на чорно-білому друці все одно вийде сірим, і це незрівнянно
 * краще, ніж лист без шапки.
 */
const loadBlackLogo = async (url: string): Promise<string> => {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return url;

    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png");
  } catch {
    return url;
  }
};

export const generateReportPdf = async ({
  directoryHandle,
  ...params
}: GenerateReportHtmlParams): Promise<void> => {
  registerReportFonts();

  // Рендер PDF синхронний, тож усе, що дочитується з бекенда, треба мати
  // на руках заздалегідь: метадані категорій (де саме в звіті їх місце) і
  // повний довідник домашнього догляду (він задає порядок груп).
  const [categoriesMeta, allHomeCares, logoSrc] = await Promise.all([
    params.categoryItems?.length ? getCategories() : Promise.resolve([]),
    params.homeCares.length ? getAllHomeCares() : Promise.resolve([]),
    loadBlackLogo(logoUrl),
  ]);

  const homeCareNames = Array.from(
    new Set(allHomeCares.map((care) => care.name?.trim()).filter(Boolean)),
  ) as string[];

  const blob = await pdf(
    <ReportPdfDocument
      params={params}
      categoriesMeta={categoriesMeta}
      homeCareNames={homeCareNames}
      logoSrc={logoSrc}
    />,
  ).toBlob();

  const fileName = `${safeFileName(
    `Рекомендаційний_лист_${params.patient.fullName?.replace(/\s+/g, "_") ?? "Пацієнт"}`,
    "Рекомендаційний_лист",
  )}.pdf`;

  const result = await saveHtmlBlob(fileName, blob, directoryHandle);

  if (result.status === "saved-to-folder") {
    toast.success("PDF-файл збережено у обрану папку.");
  } else if (result.reason === "write-failed") {
    toast.error(
      "Не вдалося записати PDF-файл у вибрану папку (можливо, файл із такою назвою зараз відкритий в іншій програмі). Файл завантажено звичайним способом.",
    );
  } else if (result.reason === "permission-denied") {
    toast.error(
      "Немає дозволу на запис у вибрану папку. Файл завантажено звичайним способом.",
    );
  }
};
