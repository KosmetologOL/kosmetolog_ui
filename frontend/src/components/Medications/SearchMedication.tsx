import { searchMedicationsByName, type IMedication } from "#api/medicationsApi";
import ExpandableText from "#components/ExpandableText";
import { useEffect, useState } from "react";

interface Props {
  medication: IMedication[];
  selectedMedications: IMedication[];
  setSelectedMedications: React.Dispatch<React.SetStateAction<IMedication[]>>;
}

const SearchMedication: React.FC<Props> = ({
  selectedMedications,
  setSelectedMedications,
}) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<IMedication[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!search.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await searchMedicationsByName(search.trim());
        setResults(res);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [search]);
  const addMedication = (medication: IMedication) => {
    if (!selectedMedications.find((e) => e._id === medication._id)) {
      setSelectedMedications((prev) => [...prev, medication]);
      setSearch("");
      setResults([]);
    }
  };

  return (
    <div className="mb-3">
      <input
        type="text"
        placeholder="Пошук засобу"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="field-input"
      />
      {loading && <p className="mt-1.5 text-sm text-ink-soft">Завантаження...</p>}
      {results.length > 0 && !loading && (
        <div className="mt-2 flex flex-col gap-1.5">
          {results.map((medication) => (
            <button
              key={medication._id}
              type="button"
              onClick={() => addMedication(medication)}
              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {medication.name}
                </span>
                {medication.recommendation && (
                  <span className="block text-xs text-ink-soft">
                    <ExpandableText text={medication.recommendation} limit={100} />
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

export default SearchMedication;
