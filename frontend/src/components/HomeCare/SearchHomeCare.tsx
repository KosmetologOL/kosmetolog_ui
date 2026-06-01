import { getAllHomeCares, type IHomeCare } from "#api/homeCaresApi";
import { searchMedicationsByName, type IMedication } from "#api/medicationsApi";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface Props {
  selectedHomeCares: IHomeCare[];
  setSelectedHomeCares: React.Dispatch<React.SetStateAction<IHomeCare[]>>;
}

const SearchHomeCare: React.FC<Props> = ({
  selectedHomeCares,
  setSelectedHomeCares,
}) => {
  const [allHomeCares, setAllHomeCares] = useState<IHomeCare[]>([]);
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, IMedication[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [loadingCares, setLoadingCares] = useState(true);
  const [checkboxes, setCheckboxes] = useState<
    Record<string, { morning: boolean; evening: boolean }>
  >({});

  useEffect(() => {
    const fetchCares = async () => {
      try {
        setLoadingCares(true);
        const data = await getAllHomeCares();
        setAllHomeCares(data);
      } finally {
        setLoadingCares(false);
      }
    };

    void fetchCares();
  }, []);

  useEffect(() => {
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};

    allHomeCares.forEach((care) => {
      const careId = String(care._id || care.name);
      const value = searchValues[careId];

      if (!value?.trim()) {
        setResults((prev) => ({ ...prev, [careId]: [] }));
        return;
      }

      timers[careId] = setTimeout(async () => {
        setLoading((prev) => ({ ...prev, [careId]: true }));
        try {
          const meds = await searchMedicationsByName(value.trim());
          setResults((prev) => ({ ...prev, [careId]: meds }));
        } finally {
          setLoading((prev) => ({ ...prev, [careId]: false }));
        }
      }, 400);
    });

    return () => Object.values(timers).forEach(clearTimeout);
  }, [searchValues, allHomeCares]);

  const handleSearchChange = (careId: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [careId]: value }));
  };

  const addHomeCare = (
    care: IHomeCare,
    medication: IMedication,
    morning: boolean,
    evening: boolean,
    careId: string,
  ) => {
    const isDuplicate = selectedHomeCares.some(
      (item) =>
        item.name === care.name && item.medicationName === medication.name,
    );

    if (isDuplicate) {
      toast.error("Цей засіб уже додано до цієї категорії!");
      return;
    }

    const newItem: IHomeCare = {
      ...care,
      _id: care._id || careId,
      medicationName: medication.name,
      recommendations: medication.recommendation,
      morning,
      evening,
    };

    setSelectedHomeCares((prev) => [...prev, newItem]);
    setSearchValues((prev) => ({ ...prev, [careId]: "" }));
    setResults((prev) => ({ ...prev, [careId]: [] }));
  };

  if (loadingCares) {
    return <p className="text-green-700 text-sm">Завантаження категорій...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {allHomeCares.map((care) => {
        const careId = String(care._id || care.name);

        return (
          <div key={careId} className="rounded-lg border border-green-300 p-3">
            <h3 className="mb-2 font-semibold text-green-700">{care.name}</h3>

            <input
              type="text"
              placeholder="Пошук засобу..."
              value={searchValues[careId] || ""}
              onChange={(e) => handleSearchChange(careId, e.target.value)}
              className="w-full rounded-md border border-green-200 px-2 py-1 text-sm focus:ring-1 focus:ring-green-300"
            />

            {loading[careId] && (
              <p className="mb-2 mt-1 text-sm text-green-700">
                Завантаження...
              </p>
            )}

            {results[careId]?.length > 0 && !loading[careId] && (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full rounded-md border border-green-200 text-center text-sm">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="px-3 py-1 text-left">Назва</th>
                      <th className="px-3 py-1 text-left">Рекомендація</th>
                      <th className="px-3 py-1 text-center">Ранок</th>
                      <th className="px-3 py-1 text-center">Вечір</th>
                      <th className="px-3 py-1 text-center">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results[careId].map((medication, index) => {
                      const medicationId =
                        medication._id ||
                        `${careId}-${medication.name}-${index}`;

                      return (
                        <tr
                          key={medicationId}
                          className="border-b border-green-100"
                        >
                          <td className="px-3 py-1 text-left">
                            {medication.name}
                          </td>
                          <td className="px-3 py-1 text-left">
                            {medication.recommendation || "—"}
                          </td>

                          <td className="px-3 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={
                                checkboxes[medicationId]?.morning || false
                              }
                              onChange={(e) =>
                                setCheckboxes((prev) => ({
                                  ...prev,
                                  [medicationId]: {
                                    ...prev[medicationId],
                                    morning: e.target.checked,
                                  },
                                }))
                              }
                            />
                          </td>

                          <td className="px-3 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={
                                checkboxes[medicationId]?.evening || false
                              }
                              onChange={(e) =>
                                setCheckboxes((prev) => ({
                                  ...prev,
                                  [medicationId]: {
                                    ...prev[medicationId],
                                    evening: e.target.checked,
                                  },
                                }))
                              }
                            />
                          </td>

                          <td className="px-3 py-1 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                addHomeCare(
                                  care,
                                  medication,
                                  checkboxes[medicationId]?.morning || false,
                                  checkboxes[medicationId]?.evening || false,
                                  careId,
                                )
                              }
                              className="font-medium text-green-600 hover:text-green-800"
                            >
                              Додати
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading[careId] &&
              (!results[careId] || results[careId].length === 0) &&
              !(searchValues[careId] || "").trim() && (
                <p className="mt-1 text-sm text-gray-500">
                  Введіть назву засобу для пошуку.
                </p>
              )}
          </div>
        );
      })}
    </div>
  );
};

export default SearchHomeCare;
