import { searchExamsByName, type IExam } from "#api/examsApi";
import ExpandableText from "#components/ExpandableText";
import React, { useEffect, useState } from "react";

interface Props {
  exams: IExam[];
  selectedExams: IExam[];
  setSelectedExams: React.Dispatch<React.SetStateAction<IExam[]>>;
}

const SearchExam: React.FC<Props> = ({ selectedExams, setSelectedExams }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<IExam[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!search.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await searchExamsByName(search.trim());
        setResults(res);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [search]);

  const addExam = (exam: IExam) => {
    if (!selectedExams.find((e) => e._id === exam._id)) {
      setSelectedExams((prev) => [...prev, exam]);
      setSearch("");
      setResults([]);
    }
  };

  return (
    <div className="mb-3">
      <input
        type="text"
        placeholder="Пошук обстеження"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="field-input"
      />
      {loading && <p className="mt-1.5 text-sm text-ink-soft">Пошук...</p>}
      {!loading && results.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {results.map((exam) => (
            <button
              key={exam._id}
              type="button"
              onClick={() => addExam(exam)}
              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {exam.name}
                </span>
                {exam.recommendation && (
                  <span className="block text-xs text-ink-soft">
                    <ExpandableText text={exam.recommendation} limit={100} />
                  </span>
                )}
              </span>
              <span className="btn btn-tint btn-sm flex-none">Додати</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchExam;
