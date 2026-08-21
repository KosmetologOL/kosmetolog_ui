import type { IPatient } from "#api/patientsApi";
import type { IReport } from "#api/reportsApi";
import type { GenerateReportHtmlParams } from "#components/ReportForm/html/generateReportHtml";
import { normalizeProcedureStages } from "#lib/normalizeProcedureStages";

/**
 * Єдине місце, де збережений лист (`IReport`) перетворюється на параметри
 * експорту. Ним користуються і форма листа, і список пацієнтів — інакше
 * той самий звіт експортувався б по-різному (саме так свого часу зникали
 * блоки «Важливо» з експорту зі списку).
 *
 * Нове поле експорту додається сюди, а не в місце виклику.
 */
export const reportToExportParams = (
  report: IReport,
  patient: IPatient,
  doctorName: string,
): GenerateReportHtmlParams => ({
  patient,
  exams: report.exams || [],
  medications: report.medications || [],
  procedures: report.procedures || [],
  procedureStages: normalizeProcedureStages(report),
  specialists: report.specialists || [],
  homeCares: report.homeCares || [],
  categoryItems: (report.categories || []).map((c) => ({
    ...c,
    _id: c._id ?? "",
  })),
  additionalInfo: report.additionalInfo || "",
  comments: report.comments || "",
  finalNote: report.finalNote || "",
  medicationsNote: report.medicationsNote || "",
  homeCareNote: report.homeCareNote || "",
  examsNote: report.examsNote || "",
  proceduresNote: report.proceduresNote || "",
  doctorName,
});
