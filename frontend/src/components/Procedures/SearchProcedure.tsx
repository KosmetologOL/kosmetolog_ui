import { searchProceduresByName, type IProcedure } from "#api/proceduresApi";
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
    <div className="mb-3">
      <input
        type="text"
        placeholder="Пошук процедури"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="field-input"
      />
      {loading && <p className="mt-1.5 text-sm text-ink-soft">Завантаження...</p>}
      {results.length > 0 && !loading && (
        <div className="mt-2 flex flex-col gap-1.5">
          {results.map((procedure) => (
            <button
              key={procedure._id}
              type="button"
              onClick={() => addProcedure(procedure)}
              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {procedure.name}
                </span>
                {procedure.recommendation && (
                  <span className="block truncate text-xs text-ink-soft">
                    {procedure.recommendation}
                  </span>
                )}
              </span>
              <span className="flex-none text-xs font-bold text-brand">
                Додати
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchProcedure;
