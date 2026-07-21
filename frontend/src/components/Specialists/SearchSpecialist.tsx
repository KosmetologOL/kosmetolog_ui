import { searchSpecialistsByName, type ISpecialist } from "#api/specialistsApi";
import { useEffect, useState } from "react";

interface Props {
  selectedSpecialists: ISpecialist[];
  setSelectedSpecialists: React.Dispatch<React.SetStateAction<ISpecialist[]>>;
}

const SearchSpecialist: React.FC<Props> = ({
  selectedSpecialists,
  setSelectedSpecialists,
}) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ISpecialist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!search.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await searchSpecialistsByName(search.trim());
        setResults(res);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [search]);

  const addSpecialist = (specialist: ISpecialist) => {
    if (!selectedSpecialists.find((e) => e._id === specialist._id)) {
      setSelectedSpecialists((prev) => [...prev, specialist]);
      setSearch("");
      setResults([]);
    }
  };

  return (
    <div className="mb-3">
      <input
        type="text"
        placeholder="Пошук спеціаліста"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="field-input"
      />

      {loading && <p className="mt-1.5 text-sm text-ink-soft">Завантаження...</p>}

      {results.length > 0 && !loading && (
        <div className="mt-2 flex flex-col gap-1.5">
          {results.map((specialist) => (
            <button
              key={specialist._id}
              type="button"
              onClick={() => addSpecialist(specialist)}
              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
            >
              <span className="truncate text-sm font-bold">
                {specialist.name}
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

export default SearchSpecialist;
