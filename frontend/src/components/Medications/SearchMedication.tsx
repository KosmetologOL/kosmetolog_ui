import { searchMedicationsByName, type IMedication } from "#api/medicationsApi";
import FormattedText from "#components/FormattedText";
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
    <>
      <input
        type="text"
        placeholder="Пошук засобу"
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
                <th className="px-2 py-1 text-left">Рекомендація</th>
                <th className="px-2 py-1 text-left">Дії</th>
              </tr>
            </thead>
            <tbody>
              {results.map((medication) => (
                <tr key={medication._id}>
                  <td className="px-2 py-1">{medication.name}</td>
                  <td className="px-2 py-1">
                    <FormattedText markdown={medication.recommendation} />
                  </td>
                  <td className="px-2 py-1">
                    <button
                      onClick={() => addMedication(medication)}
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

export default SearchMedication;
