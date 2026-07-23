import type { ISpecialist } from "#api/specialistsApi";
import React, { useState } from "react";

interface Props {
  selectedSpecialists: ISpecialist[];
  setSelectedSpecialists: React.Dispatch<React.SetStateAction<ISpecialist[]>>;
}

const SelectedSpecialistsTable: React.FC<Props> = ({
  selectedSpecialists,
  setSelectedSpecialists,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = (specialist: ISpecialist) => {
    setEditingId(specialist._id || null);
  };

  const handleInputChange = (id: string, value: string) => {
    setSelectedSpecialists((prev) =>
      prev.map((s) =>
        s._id === id
          ? {
              ...s,
              name: value,
            }
          : s
      )
    );
  };

  const handleFinishEdit = () => {
    setEditingId(null);
  };

  const handleRemove = (id: string) => {
    setSelectedSpecialists((prev) => prev.filter((s) => s._id !== id));
  };

  if (selectedSpecialists.length === 0)
    return <p className="mt-3 text-sm text-ink-soft">Нічого не вибрано</p>;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {selectedSpecialists.map((specialist) => (
        <div key={specialist._id} className="chip-row">
          <div className="min-w-0 flex-1">
            {editingId === specialist._id ? (
              <input
                type="text"
                value={specialist.name || ""}
                onChange={(e) =>
                  handleInputChange(specialist._id!, e.target.value)
                }
                className="field-input h-9"
                autoFocus
              />
            ) : (
              <button
                type="button"
                className="chip-name text-left"
                onClick={() => handleEdit(specialist)}
              >
                {specialist.name}
              </button>
            )}
          </div>

          {editingId === specialist._id ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleFinishEdit}
            >
              Готово
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => handleEdit(specialist)}
            >
              Оновити
            </button>
          )}
          <button
            type="button"
            className="chip-remove"
            aria-label="Видалити"
            onClick={() => handleRemove(specialist._id!)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default SelectedSpecialistsTable;
