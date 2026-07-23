import type { IPatient } from "#api/patientsApi";
import React from "react";

interface Props {
  reportId: string | null;
  patient: IPatient;
  onExport: () => void;
  isSubmitting?: boolean;
}

const ReportActions: React.FC<Props> = ({ reportId, onExport, isSubmitting = false }) => (
  <div className="flex flex-wrap gap-3">
    <button type="submit" disabled={isSubmitting} className="btn btn-primary min-w-[140px]">
      {isSubmitting ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-paper"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Збереження...
        </>
      ) : reportId ? (
        "Оновити звіт"
      ) : (
        "Створити звіт"
      )}
    </button>
    <button type="button" onClick={onExport} disabled={isSubmitting} className="btn btn-ghost">
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
      Експортувати PDF
    </button>
    <button
      type="button"
      onClick={() => window.history.back()}
      disabled={isSubmitting}
      className="btn btn-ghost ml-auto"
    >
      Закрити
    </button>
  </div>
);

export default ReportActions;
