import type { IMedication } from "#api/medicationsApi";
import FormattedText from "#components/FormattedText";
import ReferenceItemModal from "#components/ReferenceItemModal";
import SelectedChips from "#components/SelectedChips";
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

  return (
    <>
      <SelectedChips<IMedication>
        items={selectedMedications}
        getName={(medication) => medication.name}
        getSub={(medication) =>
          medication.recommendation ? (
            <FormattedText inline markdown={medication.recommendation} />
          ) : null
        }
        onEdit={setEditingMedication}
        editAriaLabel={() => "Редагувати засіб"}
        onRemove={(medication) =>
          setSelectedMedications((prev) =>
            prev.filter((m) => m._id !== medication._id),
          )
        }
      />

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
