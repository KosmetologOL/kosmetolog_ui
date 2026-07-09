import type { IExam } from "#api/examsApi";
import type { IHomeCare } from "#api/homeCaresApi";
import { getAllHomeCares } from "#api/homeCaresApi";
import type { IMedication } from "#api/medicationsApi";
import type { IPatient } from "#api/patientsApi";
import type { IProcedure } from "#api/proceduresApi";
import type { ISpecialist } from "#api/specialistsApi";
import logoUrl from "#assets/logo.png";
import NoahBoldTTFUrl from "#fonts/Noah-Bold.ttf";
import NoahBoldItalicTTFUrl from "#fonts/Noah-BoldItalic.ttf";
import NoahTTFUrl from "#fonts/Noah-Regular.ttf";
import NoahRegularItalicTTFUrl from "#fonts/Noah-RegularItalic.ttf";
import { jsPDF } from "jspdf";
import { toast } from "react-hot-toast/headless";

interface IProcedureStage {
  title: string;
  procedures: (IProcedure & { comment?: string; price?: number })[];
}

interface GenerateReportPDFParams {
  patient: IPatient;
  exams: IExam[];
  medications: IMedication[];
  procedures: IProcedure[];
  procedureStages?: IProcedureStage[];
  specialists: ISpecialist[];
  homeCares: IHomeCare[];
  additionalInfo: string;
  comments: string;
  finalNote?: string;
  doctorName?: string;
}

export const generateReportPDF = async ({
  patient,
  exams,
  procedures,
  procedureStages = [],
  specialists,
  homeCares,
  additionalInfo,
  comments,
  finalNote,
  doctorName,
}: GenerateReportPDFParams) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const loadFont = async (url: string) => {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        "",
      ),
    );
  };

  const [
    noahBase64,
    noahBoldBase64,
    noahRegularItalicBase64,
    noahBoldItalicBase64,
  ] = await Promise.all([
    loadFont(NoahTTFUrl),
    loadFont(NoahBoldTTFUrl),
    loadFont(NoahRegularItalicTTFUrl),
    loadFont(NoahBoldItalicTTFUrl),
  ]);

  pdf.addFileToVFS("Noah-Regular.ttf", noahBase64);
  pdf.addFont("Noah-Regular.ttf", "Noah", "normal");
  pdf.addFileToVFS("Noah-Bold.ttf", noahBoldBase64);
  pdf.addFont("Noah-Bold.ttf", "Noah", "bold");
  pdf.addFileToVFS("Noah-RegularItalic.ttf", noahRegularItalicBase64);
  pdf.addFont("Noah-RegularItalic.ttf", "Noah", "italic");
  pdf.addFileToVFS("Noah-BoldItalic.ttf", noahBoldItalicBase64);
  pdf.addFont("Noah-BoldItalic.ttf", "Noah", "bolditalic");

  pdf.setFont("Noah", "normal");
  pdf.setTextColor(0, 0, 0);

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentX = 18;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 5;
  let y = 15;

  try {
    const logoRes = await fetch(logoUrl);
    const logoBlob = await logoRes.blob();
    const logoBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(logoBlob);
    });

    const logoWidth = 28;
    const logoHeight = 17;
    const logoX = (pageWidth - logoWidth) / 2;

    pdf.addImage(logoBase64, "PNG", logoX, y, logoWidth, logoHeight);
  } catch {
    toast.error("Не вдалося завантажити логотип для PDF.");
  }

  y += 28;

  pdf.setFont("Noah", "bold");
  pdf.setFontSize(14);
  pdf.text("РЕКОМЕНДАЦІЙНИЙ ЛИСТ", pageWidth / 2, y, { align: "center" });

  y += 12;

  pdf.setFont("Noah", "bold");
  pdf.setFontSize(12);
  pdf.text("Пацієнт:", margin, y + 7);

  pdf.setFont("Noah", "normal");
  pdf.setFontSize(12);
  pdf.text(patient.fullName || "", margin + 18, y + 7);

  y += 14;

  const addSection = (title: string, lines: string[]) => {
    const ensurePage = () => {
      if (y > pageHeight - 30) {
        pdf.addPage();
        y = 18;
      }
    };

    ensurePage();

    pdf.setFont("Noah", "bold");
    pdf.setFontSize(12);
    pdf.text(`${title}:`, margin, y);
    y += 6;

    pdf.setFont("Noah", "normal");
    pdf.setFontSize(10);

    if (lines.length === 0) lines = ["—"];

    lines.forEach((line) => {
      const split = pdf.splitTextToSize(line, contentWidth - 8);
      split.forEach((row: string, rowIndex: number) => {
        ensurePage();
        const text = rowIndex === 0 ? `• ${row}` : row;
        pdf.text(text, contentX, y);
        y += lineHeight;
      });
      y += 0.5;
    });
    y += 4;
  };

  if (specialists.length > 0) {
    addSection(
      "Рекомендована консультація суміжного спеціаліста",
      specialists.map((s) => s.name),
    );
  }

  if (exams.length > 0) {
    addSection(
      "Рекомендовані обстеження",
      exams.map((e) => `${e.recommendation}`),
    );
  }

  if (homeCares.length > 0) {
    pdf.setFont("Noah", "bold");
    pdf.setFontSize(12);
    pdf.text("Домашній догляд", margin, y);
    y += 6;

    const allCares = await getAllHomeCares();

    const uniqueCategories = Array.from(
      new Set(allCares.map((c) => c.name?.trim()).filter(Boolean)),
    );

    const colX = {
      product: contentX,
      morning: pageWidth - 65,
      evening: pageWidth - 47,
      price: pageWidth - 35,
    };
    const homeCarePriceLineStartX = colX.price + 6;
    const homeCarePriceLineWidth = 18;

    for (const category of uniqueCategories) {
      if (y > 260) {
        pdf.addPage();
        y = 20;
      }

      const items = homeCares.filter((h) => h.name === category);
      if (items.length === 0) {
        continue;
      }

      pdf.setFont("Noah", "bold");
      pdf.setFontSize(11);
      pdf.text(category, 16, y);
      y += 4;

      pdf.setFont("Noah", "bold");
      pdf.setFontSize(10);
      pdf.text("День", colX.morning, y);
      pdf.text("Вечір", colX.evening, y);
      pdf.text("Орієнтовна вартість", colX.price, y);
      y += 5;

      for (const h of items) {
        if (y > 260) {
          pdf.addPage();
          y = 20;
        }

        const recommendation =
          h.recommendations?.trim() || "Рекомендацію не знайдено";
        const text = `${h.medicationName || "—"}\n· ${recommendation}`;
        const split = pdf.splitTextToSize(text, colX.morning - 30);

        const startY = y;

        split.forEach((row: string, idx: number) => {
          if (y > 260) {
            pdf.addPage();
            y = 20;
          }
          pdf.setFont("Noah", "normal");
          pdf.setFontSize(10);
          pdf.text(row, colX.product, y);

          if (idx === 0) {
            const rectY = startY - 3;
            if (h.morning) pdf.rect(colX.morning, rectY, 4, 4, "F");
            else pdf.rect(colX.morning, rectY, 4, 4);
            if (h.evening) pdf.rect(colX.evening, rectY, 4, 4, "F");
            else pdf.rect(colX.evening, rectY, 4, 4);
            pdf.line(
              homeCarePriceLineStartX,
              startY,
              homeCarePriceLineStartX + homeCarePriceLineWidth,
              startY,
            );
          }

          y += 5;
        });

        y += 2;
      }

      y += 3;
    }
  }

  if (procedureStages && procedureStages.length > 0) {
    pdf.setFont("Noah", "bold");
    pdf.setFontSize(12);
    pdf.text("Протокол процедур:", margin, y);
    y += 5;

    const priceColumnX = pageWidth - 35;
    const priceLineStartX = priceColumnX + 6;
    const priceLineWidth = 18;
    const textBlockWidth = priceColumnX - margin - 6;

    for (const [i, stage] of procedureStages.entries()) {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFont("Noah", "bold");
      pdf.setFontSize(11);
      pdf.text(`${stage.title || `Етап ${i + 1}`}`, 16, y);

      pdf.setFont("Noah", "bold");
      pdf.setFontSize(10);
      pdf.text("Орієнтовна вартість", priceColumnX, y);

      y += 6;

      pdf.setFont("Noah", "normal");
      pdf.setFontSize(10);

      if (!stage.procedures.length) {
        pdf.text("—", 20, y);
        y += 6;
        continue;
      }

      for (const [idx, proc] of stage.procedures.entries()) {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }

        if (idx > 0) {
          pdf.text("+", 20, y);
          y += 4;
        }

        const name = proc.name;
        const comment = proc.comment?.trim() ? `• ${proc.comment}` : "";

        const nameLines = pdf.splitTextToSize(name, textBlockWidth);
        const commentLines = comment
          ? pdf.splitTextToSize(comment, textBlockWidth)
          : [];

        pdf.setFont("Noah", "bolditalic");
        pdf.text(nameLines, 20, y);

        if (commentLines.length > 0) {
          pdf.setFont("Noah", "normal");
          pdf.text(commentLines, 20, y + nameLines.length * 5);
        }

        const priceY = y + 1.2;
        pdf.line(
          priceLineStartX,
          priceY,
          priceLineStartX + priceLineWidth,
          priceY,
        );

        y += (nameLines.length + commentLines.length) * 4.5 + 3;
      }

      y += 3;
    }

    y += 5;
  }

  if (procedures.length > 0) {
    addSection(
      "Рекомендації щодо процедур",
      procedures.map((p) => `${p.name}\n· ${p.recommendation}`),
    );
  }

  if (additionalInfo?.trim()) {
    addSection("Все, що необхідно знати про ваш стан", [additionalInfo]);
  }

  if (comments?.trim()) {
    addSection("Додаткова інформація", [comments]);
  }

  if (finalNote?.trim()) {
    addSection("Додатковий текст", [finalNote]);
  }

  {
    const pageHeight = pdf.internal.pageSize.getHeight();

    if (y > pageHeight - 30) {
      pdf.addPage();
    }

    const finalPageHeight = pdf.internal.pageSize.getHeight();
    const labelX = pageWidth - 78;
    const lineX = labelX + 18;
    const lineWidth = 42;
    const signatureY = finalPageHeight - 24;

    pdf.setFont("Noah", "bold");
    pdf.setFontSize(11);
    pdf.text("Лікар:", labelX, signatureY);
    pdf.line(lineX, signatureY, lineX + lineWidth, signatureY);

    if (doctorName?.trim()) {
      const name = doctorName.trim();
      pdf.setFont("Noah", "normal");
      pdf.setFontSize(10);

      const textWidth = pdf.getTextWidth(name);
      const textX = lineX + (lineWidth - textWidth) / 2;
      const textY = signatureY - 1;

      pdf.text(name, textX, textY);
    }
  }
  pdf.save(
    `Рекомендаційний_лист_${
      patient.fullName?.replace(/\s+/g, "_") ?? "Пацієнт"
    }.pdf`,
  );
};
