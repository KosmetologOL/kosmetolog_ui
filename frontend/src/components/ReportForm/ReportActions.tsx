import Spinner from "#components/Spinner";
import React from "react";

interface Props {
  isSubmitting: boolean;
  isExportingHtml: boolean;
  isExportingPdf: boolean;
  isAppendingToDocx: boolean;
  isDocxSupported: boolean;
  /** Час останнього успішного збереження (HH:MM) — тихий напис у панелі. */
  lastSavedAt: string | null;
  onExportHtml: () => void;
  onExportPdf: () => void;
  onAppendToDocx: () => void;
  onClose: () => void;
}

const ReportActions: React.FC<Props> = ({
  isSubmitting,
  isExportingHtml,
  isExportingPdf,
  isAppendingToDocx,
  isDocxSupported,
  lastSavedAt,
  onExportHtml,
  onExportPdf,
  onAppendToDocx,
  onClose,
}) => {
  const busy =
    isSubmitting || isExportingHtml || isExportingPdf || isAppendingToDocx;

  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-paper/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary min-w-[160px]"
        >
          {isSubmitting ? (
            <>
              <Spinner />
              Зберігаємо…
            </>
          ) : (
            "Зберегти лист"
          )}
        </button>

        <button
          type="button"
          onClick={onExportHtml}
          disabled={busy}
          className="btn btn-ghost"
        >
          {isExportingHtml ? (
            <Spinner className="h-4 w-4 text-brand" />
          ) : (
            <svg
              className="h-4 w-4 text-brand"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          )}
          {isExportingHtml ? "Експортуємо…" : "Експортувати HTML"}
        </button>

        <button
          type="button"
          onClick={onExportPdf}
          disabled={busy}
          className="btn btn-ghost"
        >
          {isExportingPdf ? (
            <Spinner className="h-4 w-4 text-brand" />
          ) : (
            <svg
              className="h-4 w-4 text-brand"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M9 15h1.5a1.5 1.5 0 0 0 0-3H9v6" />
              <path d="M14 18v-6h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2z" />
            </svg>
          )}
          {isExportingPdf ? "Готуємо…" : "Експортувати PDF"}
        </button>

        <button
          type="button"
          onClick={onAppendToDocx}
          disabled={busy || !isDocxSupported}
          className="btn btn-ghost"
        >
          {isAppendingToDocx ? (
            <Spinner className="h-4 w-4 text-brand" />
          ) : (
            <svg
              className="h-4 w-4 text-brand"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          )}
          {isAppendingToDocx ? "Додаємо…" : "Додати в картку (.docx)"}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="btn btn-ghost"
        >
          Закрити
        </button>

        <span
          className={`ml-auto text-sm text-ink-soft ${lastSavedAt ? "" : "invisible"}`}
          aria-hidden={lastSavedAt ? undefined : true}
        >
          Збережено о {lastSavedAt ?? "00:00"}
        </span>
      </div>

      {!isDocxSupported && (
        <p className="mt-2 text-[0.84375rem] text-ink-soft">
          Додавання в картку доступне лише у Chrome або Edge.
        </p>
      )}
    </div>
  );
};

export default ReportActions;
