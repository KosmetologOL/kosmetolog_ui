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
              <th className="px-2 py-1 text-left">Назва обстеження</th>
              <th className="px-2 py-1 text-left">Рекомендація</th>
              <th className="px-2 py-1 text-left">Дії</th>
            </tr>
          </thead>
          <tbody>
            {selectedExams.map((exam) => (
              <tr
                key={exam._id}
                className="border-b border-green-200 hover:bg-green-50"
              >
                <td className="px-2 py-1">{exam.name}</td>
                <td className="px-2 py-1">
                  <FormattedText markdown={exam.recommendation} />
                </td>
                <td className="px-2 py-1 align-top space-x-2">
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => setEditingExam(exam)}
                  >
                    Оновити
                  </button>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => handleRemove(exam._id!)}
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
