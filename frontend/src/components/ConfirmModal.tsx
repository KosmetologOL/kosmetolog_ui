import React from "react";

import Modal from "#components/Modal";
import Spinner from "#components/Spinner";

interface ConfirmModalProps {
  visible: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
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
  isLoading = false,
  loadingLabel = "Обробка…",
  onConfirm,
  onCancel,
}) => (
  <Modal
    visible={visible}
    onClose={onCancel}
    closeDisabled={isLoading}
    labelledBy="confirm-modal-title"
    panelClassName="p-6"
  >
    <div className="mb-4">
      <h2 id="confirm-modal-title" className="modal-title text-ink">
        {title}
      </h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
        {message}
      </p>
    </div>

    <div className="mt-4 flex justify-end gap-2.5">
      <button onClick={onCancel} disabled={isLoading} className="btn btn-ghost">
        {cancelLabel}
      </button>
      <button
        onClick={onConfirm}
        disabled={isLoading}
        className={`btn ${isDanger ? "btn-danger" : "btn-primary"}`}
      >
        {isLoading ? (
          <>
            <Spinner />
            {loadingLabel}
          </>
        ) : (
          confirmLabel
        )}
      </button>
    </div>
  </Modal>
);

export default ConfirmModal;
