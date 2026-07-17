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
    return (
      <p className="text-green-700 text-sm mb-2 mt-3">Нічого не вибрано</p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto mb-3 mt-3">
        <table className="min-w-full border border-green-200 rounded-md text-sm">
          <thead className="bg-green-100">
            <tr>
              <th className="px-2 py-1 text-left">Назва</th>
              <th className="px-2 py-1 text-left">Рекомендація</th>
              <th className="px-2 py-1 text-left">Дії</th>
            </tr>
          </thead>
          <tbody>
            {selectedMedications.map((medication) => (
              <tr
                key={medication._id}
                className="border-b border-green-200 hover:bg-green-50"
              >
                <td className="px-2 py-1">{medication.name}</td>
                <td className="px-2 py-1">
                  <FormattedText markdown={medication.recommendation} />
                </td>
                <td className="px-2 py-1 align-top space-x-2">
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => setEditingMedication(medication)}
                  >
                    Оновити
                  </button>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => handleRemove(medication._id!)}
                  >
                    Видалити
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
