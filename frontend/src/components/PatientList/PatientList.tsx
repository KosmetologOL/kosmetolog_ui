import type { IPatient } from "#api/patientsApi";
import * as patientsApi from "#api/patientsApi";
import PatientFormModal from "#components/PatientList/PatientFormModal";
import PatientItem from "#components/PatientList/PatientItem";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 10;

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

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await patientsApi.getAllPatients(
        page,
        PAGE_SIZE,
        query,
      );
      setPatients(response.patients);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } finally {
      setIsLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    const delay = setTimeout(fetchPatients, 400);
    return () => clearTimeout(delay);
  }, [fetchPatients]);

  const handleAddPatient = async (patient: IPatient) => {
    const createdPatient = await patientsApi.createPatient(patient);
    setShowModal(false);
    navigate(`/create-report/${createdPatient._id}`);
  };

  const handleUpdatePatient = async (patient: IPatient) => {
    if (!editingPatient?._id) return;
    await patientsApi.updatePatient(editingPatient._id, patient);
    setEditingPatient(null);
    fetchPatients();
  };

  const trimmedQuery = query.trim();
  const pageStart = (page - 1) * PAGE_SIZE;

  return (
    <>
      <div className="mb-5">
        <h1 className="text-[23px] tracking-[0.22em] uppercase">Пацієнти</h1>
        <p className="text-ink-soft text-[15px] mt-1.5">
          {isLoading
            ? "Завантаження реєстру…"
            : trimmedQuery
              ? `Знайдено: ${total} із загальної кількості`
              : `${total} ${total === 1 ? "картка" : "карток"} у реєстрі`}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-[19px] h-[19px] text-ink-soft pointer-events-none"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.8-3.8" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Пошук за прізвищем…"
            className="w-full h-13 pl-12 pr-11 rounded-xl border border-line-strong text-[16.5px] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M8 2v12M2 8h12" />
          </svg>
          Новий пацієнт
        </button>
      </div>

      <div className="bg-surface border border-line rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <ul>
            {Array.from({ length: 5 }, (_, i) => (
              <li
                key={i}
                className={`flex items-center gap-4 px-5 py-4 animate-pulse ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <span className="w-11.5 h-11.5 rounded-full bg-surface-2 flex-none" />
                <span className="flex-1">
                  <span className="block h-4 w-2/5 rounded bg-surface-2" />
                  <span className="block h-3 w-1/4 rounded bg-surface-2 mt-2" />
                </span>
              </li>
            ))}
          </ul>
        ) : patients.length === 0 ? (
          <div className="text-center py-14 px-6">
            <p className="text-lg font-bold mb-1.5">
              {trimmedQuery
                ? `Нічого не знайдено за запитом «${trimmedQuery}»`
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
              {trimmedQuery
                ? `Створити картку «${trimmedQuery}»`
                : "Новий пацієнт"}
            </button>
          </div>
        ) : (
          <ul>
            {patients.map((p, i) => (
              <li key={p._id} className={i > 0 ? "border-t border-line" : ""}>
                <PatientItem patient={p} onEdit={setEditingPatient} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isLoading && patients.length > 0 && (
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`pager-btn text-[15px] tabular-nums ${
                    n === page
                      ? "is-active"
                      : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  {n}
                </button>
              ))}
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
        patient={{ fullName: trimmedQuery && patients.length === 0 ? query : "" }}
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
