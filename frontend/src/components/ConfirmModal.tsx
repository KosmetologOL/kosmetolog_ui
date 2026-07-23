import React from "react";

interface ConfirmModalProps {
  visible: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title = "Підтвердження дії",
  message,
  confirmLabel = "Видалити",
  cancelLabel = "Скасувати",
  isDanger = true,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 py-6 backdrop-blur-sm">
      <div className="modal-panel relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface p-6 shadow-lift animate-modal-in">
        <button
          onClick={onCancel}
          aria-label="Закрити"
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink active:scale-95"
        >
          <svg
            className="h-4.5 w-4.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="mb-4">
          <h2 className="text-[17px] font-bold tracking-[0.08em] uppercase text-ink">
            {title}
          </h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
            {message}
          </p>
        </div>

        <div className="mt-4 flex justify-end gap-2.5">
          <button onClick={onCancel} className="btn btn-ghost">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`btn ${isDanger ? "bg-danger text-paper hover:opacity-90" : "btn-primary"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
