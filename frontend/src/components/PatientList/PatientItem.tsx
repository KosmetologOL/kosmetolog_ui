import type { IPatient } from "#api/patientsApi";
import { getReportByPatientId } from "#api/reportsApi";
import { generateReportPDF } from "#components/ReportForm/pdf/generateReportPDF";
import { useAuth } from "#hooks/useAuth";
import { getReportCreatorName } from "#types/getReportCreatorName";
import { normalizeProcedureStages } from "#types/normalizeProcedureStages";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

interface Props {
  patient: IPatient;
  onEdit: (patient: IPatient) => void;
}

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
};

const PatientItem: React.FC<Props> = ({ patient, onEdit }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);

  const visitDate = patient.lastVisitAt || patient.createdAt;
  const formattedVisitDate = visitDate
    ? new Date(visitDate).toLocaleDateString("uk-UA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const openChart = () => navigate(`/create-report/${patient._id}`);

  const handleExportPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExporting(true);
    try {
      const report = await getReportByPatientId(patient._id!);
      const procedureStages = normalizeProcedureStages(report);
      await generateReportPDF({
        patient,
        exams: report.exams || [],
        medications: report.medications || [],
        procedures: report.procedures || [],
        procedureStages: procedureStages,
        specialists: report.specialists || [],
        homeCares: report.homeCares || [],
        additionalInfo: report.additionalInfo || "",
        comments: report.comments || "",
        finalNote: report.finalNote || "",
        doctorName: getReportCreatorName(report.editHistory) || user?.name || "",
      });
    } catch {
      toast.error("Не вдалося створити PDF — можливо, звіт ще не створено.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <article
      onClick={openChart}
      onKeyDown={(e) => e.key === "Enter" && openChart()}
      role="button"
      tabIndex={0}
      className="flex flex-wrap items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-surface-2 outline-none focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
    >
      <span className="flex-none w-11.5 h-11.5 rounded-full bg-sage flex items-center justify-center text-[15px] font-bold tracking-wide">
        {getInitials(patient.fullName)}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 inline-flex max-w-full">
          <div className="text-[17px] font-bold truncate">{patient.fullName}</div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(patient);
            }}
            title="Редагувати ім'я пацієнта"
            aria-label="Редагувати ім'я пацієнта"
            className="flex-none p-1.5 rounded-full text-ink-soft/70 hover:text-brand hover:bg-brand-soft/60 transition-all cursor-pointer active:scale-90"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
        </div>
        {formattedVisitDate && (
          <div className="text-sm text-ink-soft mt-0.5">
            Візит · {formattedVisitDate}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:flex-none">
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="btn btn-ghost btn-sm flex-1 sm:flex-initial"
        >
          <svg
            className="w-4 h-4 text-brand"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          {isExporting ? "Готуємо…" : "PDF рекомендацій"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openChart();
          }}
          className="btn btn-tint btn-sm flex-1 sm:flex-initial"
        >
          Відкрити картку
        </button>
      </div>
    </article>
  );
};

export default PatientItem;
