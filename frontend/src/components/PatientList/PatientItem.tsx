import type { IPatient } from "#api/patientsApi";
import { getReportByPatientId } from "#api/reportsApi";
import { IconEdit } from "#components/icons";
import Spinner from "#components/Spinner";
import { appendReportToDocx } from "#components/ReportForm/docx/appendReportToDocx";
import { generateReportHtml } from "#components/ReportForm/html/generateReportHtml";
import { useAuth } from "#hooks/useAuth";
import { getReportCreatorName } from "#lib/getReportCreatorName";
import { normalizeProcedureStages } from "#lib/normalizeProcedureStages";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { isAbortError } from "#lib/abortError";
import { useNavigate } from "react-router-dom";
import { isDocxLinkingSupported } from "#lib/docxCardLink";

interface Props {
  patient: IPatient;
  onEdit: (patient: IPatient) => void;
  /** Запит пошуку — збіг підсвічується в імені пацієнта. */
  highlight?: string;
}

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
};

/** Підсвічує всі збіги запиту в тексті (без dangerouslySetInnerHTML). */
const highlightMatches = (text: string, query?: string): React.ReactNode => {
  const q = query?.trim().toLowerCase();
  if (!q) return text;
  const lower = text.toLowerCase();
  const nodes: React.ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(q);
  while (at !== -1) {
    if (at > from) nodes.push(text.slice(from, at));
    nodes.push(
      <mark key={at} className="bg-brand-soft rounded-sm px-0.5">
        {text.slice(at, at + q.length)}
      </mark>
    );
    from = at + q.length;
    at = lower.indexOf(q, from);
  }
  if (nodes.length === 0) return text;
  if (from < text.length) nodes.push(text.slice(from));
  return nodes;
};

const PatientItem: React.FC<Props> = ({ patient, onEdit, highlight }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const [isAppendingToDocx, setIsAppendingToDocx] = useState(false);
  const isDocxSupported = isDocxLinkingSupported();

  const visitDate = patient.lastVisitAt || patient.createdAt;
  const dateLabel = patient.lastVisitAt ? "Візит" : "Створено";
  const formattedVisitDate = visitDate
    ? new Date(visitDate).toLocaleDateString("uk-UA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const openChart = () => navigate(`/create-report/${patient._id}`);

  const normalizeCategoryItems = (report: Awaited<ReturnType<typeof getReportByPatientId>>) =>
    (report.categories || []).map((c) => ({ ...c, _id: c._id ?? "" }));

  const handleExportHtml = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExportingHtml(true);
    try {
      const report = await getReportByPatientId(patient._id!);
      const procedureStages = normalizeProcedureStages(report);
      await generateReportHtml({
        patient,
        exams: report.exams || [],
        medications: report.medications || [],
        procedures: report.procedures || [],
        procedureStages: procedureStages,
        specialists: report.specialists || [],
        homeCares: report.homeCares || [],
        categoryItems: normalizeCategoryItems(report),
        additionalInfo: report.additionalInfo || "",
        comments: report.comments || "",
        finalNote: report.finalNote || "",
        doctorName: getReportCreatorName(report.editHistory) || user?.name || "",
      });
    } catch (error) {
      if (isAbortError(error)) {
        toast("Скасовано — файл не збережено.", { icon: "ℹ️" });
      } else {
        toast.error("Не вдалося створити HTML — можливо, звіт ще не створено.");
      }
    } finally {
      setIsExportingHtml(false);
    }
  };

  const handleAppendToDocx = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAppendingToDocx(true);
    try {
      const report = await getReportByPatientId(patient._id!);
      const procedureStages = normalizeProcedureStages(report);
      await appendReportToDocx({
        patient,
        exams: report.exams || [],
        medications: report.medications || [],
        procedures: report.procedures || [],
        procedureStages: procedureStages,
        specialists: report.specialists || [],
        homeCares: report.homeCares || [],
        categoryItems: normalizeCategoryItems(report),
        additionalInfo: report.additionalInfo || "",
        comments: report.comments || "",
        finalNote: report.finalNote || "",
        doctorName: getReportCreatorName(report.editHistory) || user?.name || "",
      });
    } catch {
      toast.error("Не вдалося додати в картку — можливо, звіт ще не створено.");
    } finally {
      setIsAppendingToDocx(false);
    }
  };

  return (
    <article
      onClick={openChart}
      className="flex flex-wrap items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-surface-2"
    >
      <span className="flex-none w-11.5 h-11.5 rounded-full bg-sage flex items-center justify-center text-[15px] font-bold tracking-wide">
        {getInitials(patient.fullName)}
      </span>

      <div className="flex-1 min-w-0">
        <div className="inline-flex items-center gap-1 max-w-full">
          <div className="text-[17px] font-bold truncate">
            {highlightMatches(patient.fullName, highlight)}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(patient);
            }}
            title="Редагувати імʼя пацієнта"
            aria-label="Редагувати імʼя пацієнта"
            className="icon-btn flex-none text-ink-soft hover:text-brand hover:bg-brand-soft/60"
          >
            <IconEdit className="w-4 h-4" />
          </button>
        </div>
        {formattedVisitDate && (
          <div className="text-sm text-ink-soft mt-0.5">
            {dateLabel} · {formattedVisitDate}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:flex-none">
        <button
          onClick={handleExportHtml}
          disabled={isExportingHtml}
          className="btn btn-ghost btn-sm flex-1 sm:flex-initial"
        >
          {isExportingHtml ? (
            <>
              <Spinner />
              Готуємо…
            </>
          ) : (
            <>
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
              HTML рекомендацій
            </>
          )}
        </button>
        <button
          onClick={handleAppendToDocx}
          disabled={isAppendingToDocx || !isDocxSupported}
          title={
            isDocxSupported
              ? undefined
              : "Автоматичне додавання в картку доступне лише в Chrome або Edge."
          }
          className="btn btn-ghost btn-sm flex-1 sm:flex-initial"
        >
          {isAppendingToDocx ? (
            <>
              <Spinner />
              Додаємо…
            </>
          ) : (
            <>
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
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Додати в картку
            </>
          )}
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
