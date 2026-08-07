import type { ISpecialist } from "#api/specialistsApi";
import ReferenceItemModal from "#components/ReferenceItemModal";
import SelectedChips from "#components/SelectedChips";
import React, { useState } from "react";

interface Props {
  selectedSpecialists: ISpecialist[];
  setSelectedSpecialists: React.Dispatch<React.SetStateAction<ISpecialist[]>>;
}

const SelectedSpecialistsTable: React.FC<Props> = ({
  selectedSpecialists,
  setSelectedSpecialists,
}) => {
  const [editingSpecialist, setEditingSpecialist] =
    useState<ISpecialist | null>(null);

  const handleSave = (updated: { name: string }) => {
    if (!editingSpecialist?._id) {
      return;
    }

    setSelectedSpecialists((prev) =>
      prev.map((specialist) =>
        specialist._id === editingSpecialist._id
          ? { ...specialist, name: updated.name }
          : specialist,
      ),
    );
    setEditingSpecialist(null);
  };

  return (
    <>
      <SelectedChips<ISpecialist>
        items={selectedSpecialists}
        getName={(specialist) => specialist.name}
        onEdit={setEditingSpecialist}
        onRemove={(specialist) =>
          setSelectedSpecialists((prev) =>
            prev.filter((s) => s._id !== specialist._id),
          )
        }
      />

      <ReferenceItemModal
        visible={Boolean(editingSpecialist)}
        title="Редагувати спеціаліста"
        submitLabel="Зберегти"
        showRecommendation={false}
        item={{ name: editingSpecialist?.name ?? "" }}
        onClose={() => setEditingSpecialist(null)}
        onSave={handleSave}
      />
    </>
  );
};

export default SelectedSpecialistsTable;
