import { getAllHomeCares, type IHomeCare } from "#api/homeCaresApi";
import { searchMedicationsByName, type IMedication } from "#api/medicationsApi";
import FormattedText from "#components/FormattedText";
import { IconClose, IconEdit } from "#components/icons";
import ReferenceItemModal from "#components/ReferenceItemModal";
import Spinner from "#components/Spinner";
import React, { useCallback, useEffect, useState } from "react";
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
  // undefined — пошук для цієї категорії ще не виконувався (порожнє поле)
  const [results, setResults] = useState<
    Record<string, IMedication[] | undefined>
  >({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [loadingCares, setLoadingCares] = useState(true);
  const [caresError, setCaresError] = useState(false);
  const [checkboxes, setCheckboxes] = useState<
    Record<string, { morning: boolean; evening: boolean }>
  >({});

  const fetchCares = useCallback(async () => {
    try {
      setLoadingCares(true);
      setCaresError(false);
      const data = await getAllHomeCares();
      setAllHomeCares(data);
    } catch {
      setCaresError(true);
    } finally {
      setLoadingCares(false);
    }
  }, []);

  useEffect(() => {
    void fetchCares();
  }, [fetchCares]);

  useEffect(() => {
    let ignore = false;
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};

    allHomeCares.forEach((care) => {
      const careId = String(care._id || care.name);
      const value = searchValues[careId];

      if (!value?.trim()) {
        setResults((prev) => ({ ...prev, [careId]: undefined }));
        return;
      }

      timers[careId] = setTimeout(async () => {
        setLoading((prev) => ({ ...prev, [careId]: true }));
        try {
          const meds = await searchMedicationsByName(value.trim());
          if (!ignore) {
            setResults((prev) => ({ ...prev, [careId]: meds }));
          }
        } finally {
          if (!ignore) {
            setLoading((prev) => ({ ...prev, [careId]: false }));
          }
        }
      }, 400);
    });

    return () => {
      ignore = true;
      Object.values(timers).forEach(clearTimeout);
    };
  }, [searchValues, allHomeCares]);

  const handleSearchChange = (careId: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [careId]: value }));
  };

  const addHomeCare = (
    care: IHomeCare,
    medication: IMedication,
    morning: boolean,
    evening: boolean,
    checkboxKey: string,
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
      // Власний _id для кожного доданого засобу: той самий медикамент можна
      // додати у дві категорії, і спільний _id з довідника зачіпав би обидва
      // записи при видаленні/редагуванні.
      _id: crypto.randomUUID(),
      medicationName: medication.name,
      recommendations: medication.recommendation,
      morning,
      evening,
    };

    setSelectedHomeCares((prev) => [...prev, newItem]);
    toast.success(`Додано: ${medication.name}`, { id: "picker-added" });
    // Пошук і результати не скидаємо — лікар часто додає кілька засобів поспіль.
    setCheckboxes((prev) => ({
      ...prev,
      [checkboxKey]: { morning: false, evening: false },
    }));
  };

  if (loadingCares) {
    return <p className="text-sm text-ink-soft">Завантаження категорій…</p>;
  }

  if (caresError) {
    return (
      <p className="text-sm text-ink-soft">
        Не вдалося завантажити категорії догляду.{" "}
        <button
          type="button"
          onClick={() => void fetchCares()}
          className="btn-link"
        >
          Спробувати ще раз
        </button>
      </p>
    );
  }

  if (allHomeCares.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Категорій догляду ще немає. Додайте їх у розділі «Довідники → Домашній
        догляд».
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {allHomeCares.map((care) => {
        const careId = String(care._id || care.name);
        const searchValue = searchValues[careId] || "";

        const availableResults = (results[careId] || []).filter(
          (medication) =>
            !selectedHomeCares.some(
              (item) =>
                item.name === care.name &&
                item.medicationName === medication.name,
            ),
        );

        const showEmpty =
          Boolean(searchValue.trim()) &&
          !loading[careId] &&
          results[careId] !== undefined &&
          availableResults.length === 0;

        return (
          <div key={careId} className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="list-row-name mb-3">{care.name}</p>

            <div className="relative">
              <input
                type="text"
                placeholder="Пошук засобу"
                aria-label={`Пошук засобу: ${care.name}`}
                value={searchValue}
                onChange={(e) => handleSearchChange(careId, e.target.value)}
                className={`field-input${loading[careId] ? " pr-10" : ""}`}
              />
              {loading[careId] && (
                <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-soft">
                  <Spinner />
                </span>
              )}
            </div>

            {showEmpty && (
              <p className="mt-2 text-sm text-ink-soft">Нічого не знайдено</p>
            )}

            {availableResults.length > 0 && (
              <div className="select-content mt-3 flex flex-col gap-2">
                {availableResults.map((medication, index) => {
                  const medicationId =
                    medication._id ||
                    `${careId}-${medication.name}-${index}`;
                  const checkboxKey = `${careId}:${medicationId}`;

                  return (
                    <div
                      key={medicationId}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="min-w-0 truncate text-sm font-bold text-ink">
                          {medication.name}
                        </div>
                        {medication.recommendation && (
                          <FormattedText
                            markdown={medication.recommendation}
                            className="mt-1 text-xs leading-relaxed text-ink-soft"
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-line/60">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs font-medium text-ink-soft cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checkboxes[checkboxKey]?.morning ?? care.morning}
                              onChange={(e) =>
                                setCheckboxes((prev) => ({
                                  ...prev,
                                  [checkboxKey]: {
                                    ...prev[checkboxKey],
                                    morning: e.target.checked,
                                  },
                                }))
                              }
                            />
                            Ранок
                          </label>
                          <label className="flex items-center gap-1.5 text-xs font-medium text-ink-soft cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checkboxes[checkboxKey]?.evening ?? care.evening}
                              onChange={(e) =>
                                setCheckboxes((prev) => ({
                                  ...prev,
                                  [checkboxKey]: {
                                    ...prev[checkboxKey],
                                    evening: e.target.checked,
                                  },
                                }))
                              }
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
                              checkboxes[checkboxKey]?.morning ?? care.morning,
                              checkboxes[checkboxKey]?.evening ?? care.evening,
                              checkboxKey,
                            )
                          }
                          className="btn btn-tint btn-sm px-4"
                        >
                          Додати
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
                        className="chip-row anim-rise flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-surface rounded-xl border border-line p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="chip-name">
                            {h.medicationName || h.name}
                          </div>
                          {h.recommendations && (
                            <FormattedText
                              markdown={h.recommendations}
                              className="chip-sub"
                            />
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
                                />
                                {key === "morning" ? "Ранок" : "Вечір"}
                              </label>
                            ),
                          )}

                          <button
                            type="button"
                            className="icon-btn h-8 w-8 text-ink-soft hover:bg-line hover:text-ink"
                            title="Редагувати засіб"
                            aria-label="Редагувати засіб"
                            onClick={() => setEditingHomeCare(h)}
                          >
                            <IconEdit />
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
                            <IconClose className="w-3.5 h-3.5" />
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
