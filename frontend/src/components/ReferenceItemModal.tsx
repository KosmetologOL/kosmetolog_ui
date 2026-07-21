import { useEffect, useRef, useState } from "react";

interface ReferenceItemForm {
  name: string;
  recommendation?: string;
  comment?: string;
}

interface ReferenceItemModalProps {
  visible: boolean;
  title: string;
  submitLabel: string;
  item: ReferenceItemForm;
  recommendationLabel?: string;
  commentLabel?: string;
  onClose: () => void;
  onSave: (item: ReferenceItemForm) => void;
}

export default function ReferenceItemModal({
  visible,
  title,
  submitLabel,
  item,
  recommendationLabel = "Рекомендація",
  commentLabel,
  onClose,
  onSave,
}: ReferenceItemModalProps) {
  const [form, setForm] = useState<ReferenceItemForm>(item);
  const recommendationRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setForm(item);
  }, [item]);

  useEffect(() => {
    if (recommendationRef.current) {
      recommendationRef.current.style.height = "auto";
      recommendationRef.current.style.height =
        recommendationRef.current.scrollHeight + "px";
    }
  }, [form.recommendation, visible]);

  if (!visible) {
    return null;
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      window.alert("Введіть назву.");
      return;
    }

    onSave({
      name: form.name.trim(),
      recommendation: form.recommendation?.trim() ?? "",
      comment: form.comment?.trim() ?? "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 py-6 backdrop-blur-sm">
      <div className="modal-panel relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-lift">
        <button
          onClick={onClose}
          aria-label="Закрити"
          className="absolute right-4 top-4 z-10 text-2xl leading-none text-ink-soft hover:text-ink"
        >
          ×
        </button>

        <div className="border-b border-line px-6 py-5">
          <h2 className="pr-10 text-[17px] tracking-[0.14em] uppercase">
            {title}
          </h2>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-6">
          <label className="block">
            <span className="field-label">Назва</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Назва"
              className="field-input"
            />
          </label>

          <label className="block">
            <span className="field-label">{recommendationLabel}</span>
            <textarea
              ref={recommendationRef}
              value={form.recommendation ?? ""}
              onChange={(e) =>
                setForm({ ...form, recommendation: e.target.value })
              }
              placeholder={recommendationLabel}
              className="field-textarea min-h-[180px] w-full resize-y"
            />
          </label>

          {commentLabel && (
            <label className="block">
              <span className="field-label">{commentLabel}</span>
              <textarea
                value={form.comment ?? ""}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder={commentLabel}
                className="field-textarea min-h-[110px] w-full resize-y"
              />
            </label>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          <button onClick={onClose} className="btn btn-ghost">
            Скасувати
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
