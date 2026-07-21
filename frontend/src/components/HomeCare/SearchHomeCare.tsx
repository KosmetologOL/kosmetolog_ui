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
    const medicationId =
      medication._id || `${careId}-${medication.name}-${Math.random()}`;

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
      _id: medicationId,
      medicationName: medication.name,
      recommendations: medication.recommendation,
      morning,
      evening,
    };

    setSelectedHomeCares((prev) => [...prev, newItem]);
    setSearchValues((prev) => ({ ...prev, [careId]: "" }));
    setResults((prev) => ({ ...prev, [careId]: [] }));
    setCheckboxes((prev) => ({
      ...prev,
      [medicationId]: { morning: false, evening: false },
    }));
  };

  if (loadingCares) {
    return <p className="text-sm text-ink-soft">Завантаження категорій...</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {allHomeCares.map((care) => {
        const careId = String(care._id || care.name);

        return (
          <div key={careId} className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="mb-3 text-[15px] font-bold">{care.name}</p>

            <input
              type="text"
              placeholder="Пошук засобу..."
              value={searchValues[careId] || ""}
              onChange={(e) => handleSearchChange(careId, e.target.value)}
              className="field-input"
            />

            {loading[careId] && (
              <p className="mt-2 text-sm text-ink-soft">Завантаження...</p>
            )}

            {results[careId]?.length > 0 && !loading[careId] && (
              <div className="mt-3 flex flex-col gap-2">
                {results[careId].map((medication, index) => {
                  const medicationId =
                    medication._id ||
                    `${careId}-${medication.name}-${index}`;

                  return (
                    <div
                      key={medicationId}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">
                          {medication.name}
                        </div>
                        {medication.recommendation && (
                          <div className="text-xs text-ink-soft">
                            {medication.recommendation}
                          </div>
                        )}
                      </div>

                      <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                        <input
                          type="checkbox"
                          checked={checkboxes[medicationId]?.morning || false}
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
                        Ранок
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                        <input
                          type="checkbox"
                          checked={checkboxes[medicationId]?.evening || false}
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
                        Вечір
                      </label>

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
                        className="btn btn-tint btn-sm"
                      >
                        Додати
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading[careId] &&
              (!results[careId] || results[careId].length === 0) &&
              !(searchValues[careId] || "").trim() && (
                <p className="mt-2 text-sm text-ink-soft">
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
