import { searchExamsByName, type IExam } from "#api/examsApi";
import FormattedText from "#components/FormattedText";
import SearchPicker from "#components/SearchPicker";
import React from "react";

interface Props {
  selectedExams: IExam[];
  setSelectedExams: React.Dispatch<React.SetStateAction<IExam[]>>;
}

const SearchExam: React.FC<Props> = ({ selectedExams, setSelectedExams }) => {
  const addExam = (exam: IExam) => {
    setSelectedExams((prev) =>
      prev.some((e) => e._id === exam._id) ? prev : [...prev, exam],
    );
  };

  return (
    <div className="mb-3">
      <SearchPicker<IExam>
        search={searchExamsByName}
        placeholder="Пошук обстеження"
        onAdd={addExam}
        selectedIds={selectedExams.map((e) => e._id)}
        renderSub={(exam) =>
          exam.recommendation ? (
            <FormattedText inline markdown={exam.recommendation} />
          ) : null
        }
      />
    </div>
  );
};

export default SearchExam;
