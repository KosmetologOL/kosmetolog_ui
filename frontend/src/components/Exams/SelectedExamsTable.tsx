import { type IExam } from "#api/examsApi";
import FormattedText from "#components/FormattedText";
import ReferenceItemModal from "#components/ReferenceItemModal";
import SelectedChips from "#components/SelectedChips";
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

  return (
    <>
      <SelectedChips<IExam>
        items={selectedExams}
        getName={(exam) => exam.name}
        getSub={(exam) =>
          exam.recommendation ? (
            <FormattedText inline markdown={exam.recommendation} />
          ) : null
        }
        onEdit={setEditingExam}
        editAriaLabel={() => "Редагувати обстеження"}
        onRemove={(exam) =>
          setSelectedExams((prev) => prev.filter((e) => e._id !== exam._id))
        }
      />

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
