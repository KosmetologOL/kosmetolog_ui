import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

import RichTextEditor from "#components/RichTextEditor";

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
  showTimeOfDayOptions,
  onClose,
  onSave,
}: ReferenceItemModalProps) {
  const [form, setForm] = useState<ReferenceItemForm>(item);
  const commentRef = useRef<HTMLTextAreaElement | null>(null);

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

  if (!visible) {
    return null;
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Введіть назву.");
      return;
    }

    onSave({
      name: form.name.trim(),
      recommendation: form.recommendation?.trim() ?? "",
      comment: form.comment?.trim() ?? "",
      morning: form.morning,
      evening: form.evening,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 py-6 backdrop-blur-sm">
      <div className="modal-panel relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-lift">
        <button
          onClick={onClose}
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

        <div className="border-b border-line px-7 py-5">
          <h2 className="pr-10 text-[18px] font-bold tracking-[0.1em] uppercase">
            {title}
          </h2>
        </div>

        <div className="space-y-6 overflow-y-auto px-7 py-6">
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

          <div className="block">
            <span className="field-label">{recommendationLabel}</span>
            <RichTextEditor
              value={form.recommendation ?? ""}
              onChange={(markdown) =>
                setForm({ ...form, recommendation: markdown })
              }
            />
          </div>

          {showTimeOfDayOptions && (
            <div className="block">
              <span className="field-label mb-2">Час застосування</span>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer select-none bg-surface-2 hover:bg-surface-3 px-3.5 py-2 rounded-xl border border-line transition-colors">
                  <input
                    type="checkbox"
                    checked={!!form.morning}
                    onChange={(e) =>
                      setForm({ ...form, morning: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-line-strong text-brand focus:ring-brand/20"
                  />
                  <span>☀️ Ранок</span>
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer select-none bg-surface-2 hover:bg-surface-3 px-3.5 py-2 rounded-xl border border-line transition-colors">
                  <input
                    type="checkbox"
                    checked={!!form.evening}
                    onChange={(e) =>
                      setForm({ ...form, evening: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-line-strong text-brand focus:ring-brand/20"
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
