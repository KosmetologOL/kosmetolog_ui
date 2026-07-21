import type { IHomeCare } from "#api/homeCaresApi";
import ExpandableText from "#components/ExpandableText";
import ReferenceItemModal from "#components/ReferenceItemModal";
import React, { useState } from "react";

interface Props {
  selectedHomeCares: IHomeCare[];
  setSelectedHomeCares: React.Dispatch<React.SetStateAction<IHomeCare[]>>;
}

const SelectedHomeCaresTable: React.FC<Props> = ({
  selectedHomeCares,
  setSelectedHomeCares,
}) => {
  const [editingHomeCare, setEditingHomeCare] = useState<IHomeCare | null>(
    null,
  );

  const handleRemove = (id?: string) => {
    setSelectedHomeCares((prev) => prev.filter((h) => h._id !== id));
  };

  const toggle = (index: number, key: keyof IHomeCare) => {
    setSelectedHomeCares((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [key]: !h[key] } : h)),
    );
  };

  const handleSave = (updatedHomeCare: {
    name: string;
    recommendation?: string;
  }) => {
    if (!editingHomeCare?._id) {
      return;
    }

    setSelectedHomeCares((prev) =>
      prev.map((item) =>
        item._id === editingHomeCare._id
          ? {
              ...item,
              medicationName: updatedHomeCare.name,
              recommendations: updatedHomeCare.recommendation ?? "",
            }
          : item,
      ),
    );

    setEditingHomeCare(null);
  };

  if (selectedHomeCares.length === 0) {
    return <p className="mt-3 text-sm text-ink-soft">Нічого не вибрано</p>;
  }

  return (
    <>
      <div className="mt-3 flex flex-col gap-2">
        {selectedHomeCares.map((h, i) => (
          <div key={h._id || i} className="chip-row flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="chip-name font-bold text-ink text-[15px]">{h.name}</div>
              {(h.medicationName || h.recommendations) && (
                <div className="chip-sub mt-0.5 text-xs text-ink-soft whitespace-pre-wrap leading-relaxed">
                  {h.medicationName && h.medicationName !== "" && (
                    <span className="font-semibold text-ink-soft">{h.medicationName}</span>
                  )}
                  {h.recommendations && h.recommendations !== "" && (
                    <span>{h.medicationName ? " · " : ""}<ExpandableText text={h.recommendations} limit={120} /></span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              {(["morning", "evening"] as (keyof IHomeCare)[]).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-1.5 text-xs font-medium text-ink-soft cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={!!h[key]}
                    onChange={() => toggle(i, key)}
                    className="rounded border-line-strong text-brand focus:ring-brand/20"
                  />
                  {key === "morning" ? "Ранок" : "Вечір"}
                </label>
              ))}

              <button
                type="button"
                className="btn btn-ghost btn-sm px-2.5"
                title="Редагувати засіб"
                aria-label="Редагувати засіб"
                onClick={() => setEditingHomeCare(h)}
              >
                <svg
                  className="w-3.5 h-3.5 text-ink-soft"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
              <button
                type="button"
                className="chip-remove"
                aria-label="Видалити"
                onClick={() => handleRemove(h._id)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <ReferenceItemModal
        visible={Boolean(editingHomeCare)}
        title="Редагувати засіб"
        submitLabel="Зберегти"
        recommendationLabel="Рекомендації"
        item={{
          name: editingHomeCare?.medicationName ?? "",
          recommendation: editingHomeCare?.recommendations ?? "",
        }}
        onClose={() => setEditingHomeCare(null)}
        onSave={handleSave}
      />
    </>
  );
};

export default SelectedHomeCaresTable;
