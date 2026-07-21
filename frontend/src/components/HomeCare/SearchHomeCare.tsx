import { getAllHomeCares, type IHomeCare } from "#api/homeCaresApi";
import { searchMedicationsByName, type IMedication } from "#api/medicationsApi";
import ExpandableText from "#components/ExpandableText";
import ReferenceItemModal from "#components/ReferenceItemModal";
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
  const [editingHomeCare, setEditingHomeCare] = useState<IHomeCare | null>(null);
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
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[14.5px] font-bold text-ink">
                          {medication.name}
                        </div>
                        {medication.recommendation && (
                          <div className="text-xs text-ink-soft mt-1 leading-relaxed whitespace-pre-wrap">
                            <ExpandableText text={medication.recommendation} limit={120} />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-line/60">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs font-medium text-ink-soft cursor-pointer select-none">
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
                              className="rounded border-line-strong text-brand focus:ring-brand/20"
                            />
                            Ранок
                          </label>
                          <label className="flex items-center gap-1.5 text-xs font-medium text-ink-soft cursor-pointer select-none">
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
                              className="rounded border-line-strong text-brand focus:ring-brand/20"
                            />
                            Вечір
                          </label>
                        </div>

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
                          className="btn btn-tint btn-sm px-4"
                        >
                          + Додати
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Список уже доданих засобів для цієї конкретної категорії (Обличчя, Очі і т.д.) */}
            {(() => {
              const currentCategoryItems = selectedHomeCares.filter(
                (h) => h.name === care.name,
              );

              if (currentCategoryItems.length === 0) return null;

              return (
                <div className="mt-3 flex flex-col gap-2 pt-3 border-t border-line/70">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Вибрано для «{care.name}»:
                  </p>
                  {currentCategoryItems.map((h) => {
                    const itemIndex = selectedHomeCares.findIndex(
                      (item) => item._id === h._id && item.name === h.name,
                    );

                    return (
                      <div
                        key={h._id || `${h.name}-${h.medicationName}`}
                        className="chip-row flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-surface rounded-xl border border-line p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="chip-name font-bold text-ink text-[14.5px]">
                            {h.medicationName || h.name}
                          </div>
                          {h.recommendations && (
                            <div className="chip-sub mt-0.5 text-xs text-ink-soft whitespace-pre-wrap leading-relaxed">
                              <ExpandableText text={h.recommendations} limit={120} />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          {(["morning", "evening"] as (keyof IHomeCare)[]).map(
                            (key) => (
                              <label
                                key={key}
                                className="flex items-center gap-1.5 text-xs font-medium text-ink-soft cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={!!h[key]}
                                  onChange={() => {
                                    if (itemIndex !== -1) {
                                      setSelectedHomeCares((prev) =>
                                        prev.map((item, idx) =>
                                          idx === itemIndex
                                            ? { ...item, [key]: !item[key] }
                                            : item,
                                        ),
                                      );
                                    }
                                  }}
                                  className="rounded border-line-strong text-brand focus:ring-brand/20"
                                />
                                {key === "morning" ? "Ранок" : "Вечір"}
                              </label>
                            ),
                          )}

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm px-2.5"
                            title="Редагувати засіб"
                            aria-label="Редагувати засіб"
                            onClick={() => setEditingHomeCare(h)}
                          >
                            <svg
                              className="w-3.5 h-3.5 text-ink-soft"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="chip-remove"
                            aria-label="Видалити"
                            onClick={() => {
                              setSelectedHomeCares((prev) =>
                                prev.filter((item) => item._id !== h._id),
                              );
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        );
      })}

      <ReferenceItemModal
        visible={Boolean(editingHomeCare)}
        title="Редагувати засіб"
        submitLabel="Зберегти"
        recommendationLabel="Рекомендації"
        showTimeOfDayOptions={true}
        item={{
          name: editingHomeCare?.medicationName ?? "",
          recommendation: editingHomeCare?.recommendations ?? "",
          morning: editingHomeCare?.morning ?? false,
          evening: editingHomeCare?.evening ?? false,
        }}
        onClose={() => setEditingHomeCare(null)}
        onSave={(updated) => {
          if (!editingHomeCare?._id) return;
          setSelectedHomeCares((prev) =>
            prev.map((item) =>
              item._id === editingHomeCare._id
                ? {
                    ...item,
                    medicationName: updated.name,
                    recommendations: updated.recommendation ?? "",
                    morning: updated.morning ?? false,
                    evening: updated.evening ?? false,
                  }
                : item,
            ),
          );
          setEditingHomeCare(null);
        }}
      />
    </div>
  );
};

export default SearchHomeCare;
