import type { IHomeCare } from "#api/homeCaresApi";
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
          <div key={h._id || i} className="chip-row flex-wrap items-center">
            <div className="min-w-0 flex-1">
              <div className="chip-name">{h.name}</div>
              <div className="chip-sub">
                {h.medicationName && h.medicationName !== ""
                  ? h.medicationName
                  : "—"}
                {h.recommendations && h.recommendations !== "" && (
                  <span className="whitespace-pre-wrap"> · {h.recommendations}</span>
                )}
              </div>
            </div>

            {(["morning", "evening"] as (keyof IHomeCare)[]).map((key) => (
              <label
                key={key}
                className="flex items-center gap-1.5 text-xs text-ink-soft"
              >
                <input
                  type="checkbox"
                  checked={!!h[key]}
                  onChange={() => toggle(i, key)}
                />
                {key === "morning" ? "Ранок" : "Вечір"}
              </label>
            ))}

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setEditingHomeCare(h)}
            >
              Оновити
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
