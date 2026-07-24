import type { IMedication } from "#api/medicationsApi";
import FormattedText from "#components/FormattedText";
import ReferenceItemModal from "#components/ReferenceItemModal";
import React, { useState } from "react";

interface Props {
  selectedMedications: IMedication[];
  setSelectedMedications: React.Dispatch<React.SetStateAction<IMedication[]>>;
}

const SelectedMedicationsTable: React.FC<Props> = ({
  selectedMedications,
  setSelectedMedications,
}) => {
  const [editingMedication, setEditingMedication] =
    useState<IMedication | null>(null);

  const handleSave = (updatedMedication: {
    name: string;
    recommendation?: string;
  }) => {
    if (!editingMedication?._id) {
      return;
    }

    setSelectedMedications((prev) =>
      prev.map((medication) =>
        medication._id === editingMedication._id
          ? {
              ...medication,
              name: updatedMedication.name,
              recommendation: updatedMedication.recommendation ?? "",
            }
          : medication,
      ),
    );
    setEditingMedication(null);
  };

  const handleRemove = (id: string) => {
    setSelectedMedications((prev) => prev.filter((m) => m._id !== id));
  };

  if (selectedMedications.length === 0) {
    return <p className="mt-3 text-sm text-ink-soft">Нічого не вибрано</p>;
  }

  return (
    <>
      <div className="mt-3 flex flex-col gap-2">
        {selectedMedications.map((medication) => (
          <div key={medication._id} className="chip-row">
            <div className="min-w-0 flex-1">
              <div className="chip-name">{medication.name}</div>
              {medication.recommendation && (
                <FormattedText
                  markdown={medication.recommendation}
                  className="chip-sub"
                />
              )}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm px-2.5"
              title="Редагувати засіб"
              aria-label="Редагувати засіб"
              onClick={() => setEditingMedication(medication)}
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
              onClick={() => handleRemove(medication._id!)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <ReferenceItemModal
        visible={Boolean(editingMedication)}
        title="Редагувати засіб"
        submitLabel="Зберегти"
        item={{
          name: editingMedication?.name ?? "",
          recommendation: editingMedication?.recommendation ?? "",
        }}
        onClose={() => setEditingMedication(null)}
        onSave={handleSave}
      />
    </>
  );
};

export default SelectedMedicationsTable;
