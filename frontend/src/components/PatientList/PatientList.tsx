import type { IPatient } from "#api/patientsApi";
import * as patientsApi from "#api/patientsApi";
import { IconPlus, IconSearch } from "#components/icons";
import PatientFormModal from "#components/PatientList/PatientFormModal";
import PatientItem from "#components/PatientList/PatientItem";
import { useDebouncedValue } from "#hooks/useDebouncedValue";
import { plural } from "#lib/plural";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 10;

/** Вікно пагінації: 1 … (current±1) … total, коли сторінок більше за 7. */
const getPageItems = (current: number, totalPages: number): (number | "…")[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) items.push("…");
  for (let n = start; n <= end; n++) items.push(n);
  if (end < totalPages - 1) items.push("…");
  items.push(totalPages);
  return items;
};

const PatientList: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<IPatient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Дебаунс лише на текст пошуку: перше завантаження і пагінація — одразу.
  const debouncedQuery = useDebouncedValue(query, 400);

  const fetchPatients = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setHasError(false);
      try {
        const response = await patientsApi.getAllPatients(
          page,
          PAGE_SIZE,
          debouncedQuery,
          { signal },
        );
        setPatients(response.patients);
        setTotal(response.total);
        setTotalPages(response.totalPages);
        setIsLoading(false);
      } catch (error) {
        // Скасований запит (нова сторінка/запит уже в дорозі) — без setState.
        if (axios.isCancel(error)) return;
        setHasError(true);
        setIsLoading(false);
      }
    },
    [page, debouncedQuery],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchPatients(controller.signal);
    return () => controller.abort();
  }, [fetchPatients]);

  const handleAddPatient = async (patient: { fullName: string }) => {
    const createdPatient = await patientsApi.createPatient(patient);
    navigate(`/create-report/${createdPatient._id}`);
  };

  const handleUpdatePatient = async (patient: { fullName: string }) => {
    if (!editingPatient?._id) return;
    await patientsApi.updatePatient(editingPatient._id, patient);
    toast.success("Дані пацієнта оновлено");
    fetchPatients();
  };

  const trimmedQuery = query.trim();
  const highlightQuery = debouncedQuery.trim();
  const shortQuery =
    trimmedQuery.length > 24 ? `${trimmedQuery.slice(0, 24)}…` : trimmedQuery;
  const pageStart = (page - 1) * PAGE_SIZE;

  return (
    <>
      <div className="mb-5">
        <h1 className="text-[23px] tracking-[0.22em] uppercase">Пацієнти</h1>
        <p className="text-ink-soft text-[15px] mt-1.5">
          {isLoading
            ? "Завантаження реєстру…"
            : hasError
              ? "Не вдалося завантажити реєстр"
              : trimmedQuery
                ? `Знайдено карток: ${total}`
                : `${total} ${plural(total, ["картка", "картки", "карток"])} у реєстрі`}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div role="search" className="relative flex-1">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-[19px] h-[19px] text-ink-soft pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Пошук за прізвищем…"
            aria-label="Пошук пацієнтів"
            className="field-input field-input-lg pl-12 pr-11"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
              aria-label="Очистити пошук"
              className="icon-btn absolute right-2 top-1/2 -translate-y-1/2 text-xl text-ink-soft hover:bg-surface-2 hover:text-ink"
            >
              ×
            </button>
          )}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-lg flex-none"
        >
          <IconPlus />
          Новий пацієнт
        </button>
      </div>

      <div className="bg-surface border border-line rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <ul>
            {Array.from({ length: patients.length || PAGE_SIZE }, (_, i) => (
              <li
                key={i}
                className={`flex items-center gap-4 px-5 py-4 ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <span className="skeleton w-11.5 h-11.5 rounded-full flex-none" />
                <span className="flex-1">
                  <span className="skeleton block h-4 w-2/5" />
                  <span className="skeleton block h-3 w-1/4 mt-2" />
                </span>
              </li>
            ))}
          </ul>
        ) : hasError ? (
          <div className="text-center py-14 px-6">
            <p className="text-lg font-bold mb-1.5">
              Не вдалося завантажити реєстр
            </p>
            <p className="text-ink-soft max-w-[40ch] mx-auto mb-5">
              Перевірте зʼєднання з інтернетом і спробуйте ще раз.
            </p>
            <button onClick={() => fetchPatients()} className="btn btn-tint">
              Спробувати ще раз
            </button>
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-14 px-6">
            <p className="text-lg font-bold mb-1.5">
              {trimmedQuery
                ? `Нічого не знайдено за запитом «${shortQuery}»`
                : "У реєстрі поки немає карток"}
            </p>
            <p className="text-ink-soft max-w-[40ch] mx-auto mb-5">
              {trimmedQuery
                ? "Перевірте написання — або одразу створіть нову картку з цим імʼям."
                : "Створіть першу картку пацієнта — це займає менш ніж хвилину."}
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary"
            >
              {trimmedQuery ? `Створити картку «${shortQuery}»` : "Новий пацієнт"}
            </button>
          </div>
        ) : (
          <ul>
            {patients.map((p, i) => (
              <li
                key={p._id}
                className={`anim-rise ${i > 0 ? "border-t border-line" : ""}`}
                style={
                  i < 10
                    ? ({ "--stagger": i } as React.CSSProperties)
                    : undefined
                }
              >
                <PatientItem
                  patient={p}
                  onEdit={setEditingPatient}
                  highlight={highlightQuery}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isLoading && !hasError && patients.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <span className="text-ink-soft text-[14.5px] tabular-nums">
            Показано {pageStart + 1}–{pageStart + patients.length} із {total}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                aria-label="Попередня сторінка"
                className="pager-btn text-ink-soft hover:bg-surface-2 hover:text-ink disabled:opacity-40"
              >
                ‹
              </button>
              {getPageItems(page, totalPages).map((item, idx) =>
                item === "…" ? (
                  <span
                    key={`gap-${idx}`}
                    className="pager-btn pointer-events-none text-ink-soft"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    aria-current={item === page ? "page" : undefined}
                    className={`pager-btn text-[15px] tabular-nums ${
                      item === page
                        ? "is-active"
                        : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                aria-label="Наступна сторінка"
                className="pager-btn text-ink-soft hover:bg-surface-2 hover:text-ink disabled:opacity-40"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}

      <PatientFormModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleAddPatient}
        patient={{
          fullName:
            trimmedQuery && patients.length === 0 ? trimmedQuery : "",
        }}
      />

      <PatientFormModal
        visible={Boolean(editingPatient)}
        onClose={() => setEditingPatient(null)}
        onSave={handleUpdatePatient}
        patient={editingPatient ?? { fullName: "" }}
        title="Редагувати дані пацієнта"
      />
    </>
  );
};

export default PatientList;
