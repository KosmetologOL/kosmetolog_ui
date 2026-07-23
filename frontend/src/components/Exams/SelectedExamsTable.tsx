import { type IExam } from "#api/examsApi";
import FormattedText from "#components/FormattedText";
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
                <FormattedText
                  markdown={exam.recommendation}
                  className="chip-sub"
                />
              )}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm px-2.5"
              title="Редагувати обстеження"
              aria-label="Редагувати обстеження"
              onClick={() => setEditingExam(exam)}
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
