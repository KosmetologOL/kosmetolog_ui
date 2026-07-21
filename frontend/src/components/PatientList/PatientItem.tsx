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
        <div className="text-[17px] font-bold truncate">{patient.fullName}</div>
        {formattedVisitDate && (
          <div className="text-sm text-ink-soft mt-0.5">
            Візит · {formattedVisitDate}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5 w-full sm:w-auto sm:flex-none">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(patient);
          }}
          className="btn btn-ghost btn-sm"
        >
          Редагувати
        </button>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="btn btn-ghost btn-sm"
        >
          {isExporting ? "Готуємо…" : "PDF рекомендацій"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openChart();
          }}
          className="btn btn-tint btn-sm"
        >
          Відкрити картку
        </button>
      </div>
    </article>
  );
};

export default PatientItem;
