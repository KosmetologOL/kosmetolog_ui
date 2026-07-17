import { searchProceduresByName, type IProcedure } from "#api/proceduresApi";
import FormattedText from "#components/FormattedText";
import { useEffect, useState } from "react";

interface Props<T extends IProcedure> {
  selectedProcedures: T[];
  setSelectedProcedures: React.Dispatch<React.SetStateAction<T[]>>;
}

const SearchProcedure: React.FC<Props<IProcedure>> = ({
  selectedProcedures,
  setSelectedProcedures,
}) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<IProcedure[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!search.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await searchProceduresByName(search.trim());
        setResults(res);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [search]);

  const addProcedure = (procedure: IProcedure) => {
    if (!selectedProcedures.find((e) => e._id === procedure._id)) {
      setSelectedProcedures((prev) => [...prev, procedure]);
      setSearch("");
      setResults([]);
    }
  };

  return (
    <>
      <input
        type="text"
        placeholder="Пошук процедури"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-2 py-1 border border-green-200 rounded-md text-sm focus:ring-1 focus:ring-green-300"
      />
      {loading && (
        <p className="text-green-700 text-sm mb-2">Завантаження...</p>
      )}
      {results.length > 0 && !loading && (
        <div className="overflow-x-auto mb-3 mt-2">
          <table className="min-w-full border border-green-200 rounded-md text-sm">
            <thead className="bg-green-100">
              <tr>
                <th className="px-2 py-1 text-left">Назва</th>
                <th className="px-2 py-1 text-left">Опис</th>
                <th className="px-2 py-1 text-left">Дії</th>
              </tr>
            </thead>
            <tbody>
              {results.map((procedure) => (
                <tr key={procedure._id}>
                  <td className="px-2 py-1">{procedure.name}</td>
                  <td className="px-2 py-1">
                    <FormattedText markdown={procedure.recommendation} />
                  </td>
                  <td className="px-2 py-1">
                    <button
                      onClick={() => addProcedure(procedure)}
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
    </>
  );
};

export default SearchProcedure;
