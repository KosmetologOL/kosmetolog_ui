import { searchExamsByName, type IExam } from "#api/examsApi";
import FormattedText from "#components/FormattedText";
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
    <div className="mb-2">
      <input
        type="text"
        placeholder="Пошук обстеження"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-2 py-1 border border-green-200 rounded-md text-sm focus:ring-1 focus:ring-green-300"
      />
      {loading && <p className="text-xs text-green-700 mt-1">Пошук...</p>}
      {!loading && results.length > 0 && (
        <div className="overflow-x-auto mb-3">
          <table className="min-w-full border border-green-200 rounded-md text-sm">
            <thead className="bg-green-100">
              <tr>
                <th className="px-2 py-1 text-left">Назва</th>
                <th className="px-2 py-1 text-left">Рекомендація</th>
                <th className="px-2 py-1 text-left">Дії</th>
              </tr>
            </thead>
            <tbody>
              {results.map((exam) => (
                <tr key={exam._id}>
                  <td className="px-2 py-1">{exam.name}</td>
                  <td className="px-2 py-1">
                    <FormattedText markdown={exam.recommendation} />
                  </td>
                  <td className="px-2 py-1">
                    <button
                      onClick={() => addExam(exam)}
                      className="text-green-500 hover:text-green-700"
                    >
                      Додати
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SearchExam;
