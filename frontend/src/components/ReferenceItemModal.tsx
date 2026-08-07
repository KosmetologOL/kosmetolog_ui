import { useEffect, useId, useRef, useState } from "react";
import { toast } from "react-hot-toast";

import Modal from "#components/Modal";
import RichTextEditor from "#components/RichTextEditor";
import Spinner from "#components/Spinner";

interface ReferenceItemForm {
  name: string;
  recommendation?: string;
  comment?: string;
  morning?: boolean;
  evening?: boolean;
}

interface ReferenceItemModalProps {
  visible: boolean;
  title: string;
  submitLabel: string;
  item: ReferenceItemForm;
  recommendationLabel?: string;
  commentLabel?: string;
  showTimeOfDayOptions?: boolean;
  /** false — ховає поле «Рекомендація» (напр. для спеціалістів). */
  showRecommendation?: boolean;
  onClose: () => void;
  onSave: (item: ReferenceItemForm) => void | Promise<void>;
}

export default function ReferenceItemModal({
  visible,
  title,
  submitLabel,
  item,
  recommendationLabel = "Рекомендація",
  commentLabel,
  showTimeOfDayOptions,
  showRecommendation = true,
  onClose,
  onSave,
}: ReferenceItemModalProps) {
  const [form, setForm] = useState<ReferenceItemForm>(item);
  const [isSaving, setIsSaving] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    setForm(item);
  }, [item]);

  useEffect(() => {
    if (commentRef.current) {
      commentRef.current.style.height = "auto";
      commentRef.current.style.height =
        commentRef.current.scrollHeight + "px";
    }
  }, [form.comment, visible]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Введіть назву.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        recommendation: form.recommendation?.trim() ?? "",
        comment: form.comment?.trim() ?? "",
        morning: form.morning,
        evening: form.evening,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      labelledBy={titleId}
      maxWidth="max-w-3xl"
      panelClassName="max-h-[90vh]"
      closeDisabled={isSaving}
    >
      <div className="border-b border-line px-7 py-5">
        <h2 id={titleId} className="modal-title pr-10">
          {title}
        </h2>
      </div>

      <div className="space-y-6 overflow-y-auto px-7 py-6">
        <label className="block">
          <span className="field-label">Назва</span>
          <input
            type="text"
            data-autofocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Назва"
            className="field-input"
          />
        </label>

        {showRecommendation && (
          <div className="block">
            <span className="field-label">{recommendationLabel}</span>
            <RichTextEditor
              value={form.recommendation ?? ""}
              onChange={(markdown) =>
                setForm({ ...form, recommendation: markdown })
              }
            />
          </div>
        )}

        {showTimeOfDayOptions && (
          <div className="block">
            <span className="field-label mb-2">Час застосування</span>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer select-none bg-surface-2 hover:bg-brand-soft/50 px-3.5 py-2 rounded-xl border border-line transition-colors">
                <input
                  type="checkbox"
                  checked={!!form.morning}
                  onChange={(e) =>
                    setForm({ ...form, morning: e.target.checked })
                  }
                />
                <span>☀️ Ранок</span>
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer select-none bg-surface-2 hover:bg-brand-soft/50 px-3.5 py-2 rounded-xl border border-line transition-colors">
                <input
                  type="checkbox"
                  checked={!!form.evening}
                  onChange={(e) =>
                    setForm({ ...form, evening: e.target.checked })
                  }
                />
                <span>🌙 Вечір</span>
              </label>
            </div>
          </div>
        )}

        {commentLabel && (
          <label className="block">
            <span className="field-label">{commentLabel}</span>
            <textarea
              ref={commentRef}
              value={form.comment ?? ""}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder={commentLabel}
              rows={4}
              className="field-textarea min-h-[100px] w-full resize-y leading-relaxed text-[15px]"
            />
          </label>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-line px-7 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="btn btn-ghost"
        >
          Скасувати
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary"
        >
          {isSaving ? (
            <>
              <Spinner />
              Зберігаємо…
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </Modal>
  );
}
