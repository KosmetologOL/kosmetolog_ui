import { useEffect, useRef, useState } from "react";

import RichTextEditor from "#components/RichTextEditor";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-green-100 bg-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-xl text-gray-500 shadow-sm transition hover:text-black"
        >
          ×
        </button>

        <div className="border-b border-green-100 bg-gradient-to-r from-green-50 via-white to-emerald-50 px-6 py-5">
          <h2 className="pr-10 text-xl font-semibold text-green-900 sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Відредагуйте вміст і збережіть зміни.
          </p>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Назва</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Назва"
              className="w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-gray-800 shadow-sm outline-none transition focus:border-green-400 focus:ring-4 focus:ring-green-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {recommendationLabel}
            </label>
            <RichTextEditor
              value={form.recommendation ?? ""}
              onChange={(markdown) =>
                setForm({ ...form, recommendation: markdown })
              }
            />
          </div>

          {commentLabel && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {commentLabel}
              </label>
              <textarea
                ref={commentRef}
                value={form.comment ?? ""}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder={commentLabel}
                className="min-h-[150px] w-full rounded-2xl border border-green-200 bg-slate-50 px-4 py-4 text-[15px] leading-7 text-gray-800 shadow-inner outline-none transition focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-100 resize-y"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-green-100 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium transition hover:bg-gray-100"
          >
            Скасувати
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
