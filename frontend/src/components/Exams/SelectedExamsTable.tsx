import { type IExam } from "#api/examsApi";
import ReferenceItemModal from "#components/ReferenceItemModal";
import React, { useState } from "react";

interface Props {
  selectedExams: IExam[];
  setSelectedExams: React.Dispatch<React.SetStateAction<IExam[]>>;
}

const SelectedExamsTable: React.FC<Props> = ({
  selectedExams,
  setSelectedExams,
}) => {
  const [editingExam, setEditingExam] = useState<IExam | null>(null);

  const handleSave = (updatedExam: {
    name: string;
    recommendation?: string;
  }) => {
    if (!editingExam?._id) {
      return;
    }

    setSelectedExams((prev) =>
      prev.map((exam) =>
        exam._id === editingExam._id
          ? {
              ...exam,
              name: updatedExam.name,
              recommendation: updatedExam.recommendation ?? "",
            }
          : exam,
      ),
    );
    setEditingExam(null);
  };

  const handleRemove = (id: string) => {
    setSelectedExams((prev) => prev.filter((e) => e._id !== id));
  };

  if (selectedExams.length === 0) {
    return <p className="mt-3 text-sm text-ink-soft">Нічого не вибрано</p>;
  }

  return (
    <>
      <div className="mt-3 flex flex-col gap-2">
        {selectedExams.map((exam) => (
          <div key={exam._id} className="chip-row">
            <div className="min-w-0 flex-1">
              <div className="chip-name">{exam.name}</div>
              {exam.recommendation && (
                <div className="chip-sub whitespace-pre-wrap">
                  {exam.recommendation}
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setEditingExam(exam)}
            >
              Оновити
            </button>
            <button
              type="button"
              className="chip-remove"
              aria-label="Видалити"
              onClick={() => handleRemove(exam._id!)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <ReferenceItemModal
        visible={Boolean(editingExam)}
        title="Редагувати обстеження"
        submitLabel="Зберегти"
        item={{
          name: editingExam?.name ?? "",
          recommendation: editingExam?.recommendation ?? "",
        }}
        onClose={() => setEditingExam(null)}
        onSave={handleSave}
      />
    </>
  );
};

export default SelectedExamsTable;
