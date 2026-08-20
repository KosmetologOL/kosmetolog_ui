import type { IPatient } from "#api/patientsApi";
import * as patientsApi from "#api/patientsApi";
import ConfirmModal from "#components/ConfirmModal";
import { IconEdit, IconSearch } from "#components/icons";
import PatientFormModal from "#components/PatientList/PatientFormModal";
import { useDebouncedValue } from "#hooks/useDebouncedValue";
import { getPageItems } from "#lib/pagination";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const PAGE_SIZE = 20;

export default function PatientManager({
  canDelete = true,
}: {
  canDelete?: boolean;
}) {
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [editingPatient, setEditingPatient] = useState<IPatient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<IPatient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleUpdatePatient = async (patient: { fullName: string }) => {
    if (!editingPatient?._id) return;
    await patientsApi.updatePatient(editingPatient._id, patient);
    toast.success("Дані пацієнта оновлено.");
    void fetchPatients();
  };

  const handleConfirmDelete = async () => {
    if (!deletingPatient?._id) return;
    setIsDeleting(true);
    try {
      await patientsApi.deletePatient(deletingPatient._id);
      setDeletingPatient(null);
      toast.success("Картку пацієнта видалено.");
      // Остання картка на останній сторінці — інакше лишилися б на порожній.
      if (page > 1 && patients.length === 1) {
        setPage((prev) => prev - 1);
      } else {
        void fetchPatients();
      }
    } catch {
      toast.error("Не вдалося видалити картку. Спробуйте ще раз.");
    } finally {
      setIsDeleting(false);
    }
  };

  const trimmedQuery = query.trim();
  const shortQuery =
    trimmedQuery.length > 24 ? `${trimmedQuery.slice(0, 24)}…` : trimmedQuery;

  return (
    <div className="flex w-full flex-col items-start">
      <div className="mb-6 w-full">
        <h2 className="panel-title">Пацієнти</h2>
        {/* На екрані помилки підпис не дублюємо — про неї каже блок нижче. */}
        {!hasError && (
          <p className="mt-0.5 text-xs text-ink-soft">
            {isLoading
              ? "Завантаження…"
              : trimmedQuery
                ? `Знайдено: ${total}`
                : `Усього: ${total}`}
          </p>
        )}
      </div>

      <div className="relative mb-5 w-full max-w-md">
        <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-soft pointer-events-none" />
        <input
          type="text"
          placeholder="Пошук за прізвищем…"
          aria-label="Пошук пацієнтів"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="field-input pl-10 pr-9 w-full"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setPage(1);
            }}
            aria-label="Очистити пошук"
            className="icon-btn absolute right-1.5 top-1/2 -translate-y-1/2 text-lg text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            ×
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex w-full flex-col gap-2.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="list-row">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-4 w-44 max-w-full" />
              </div>
              <div className="list-row-actions">
                <div className="skeleton h-9.5 w-[110px]" />
                {canDelete && <div className="skeleton h-9.5 w-[110px]" />}
              </div>
            </div>
          ))}
        </div>
      ) : hasError ? (
        <div className="w-full py-8 text-center">
          <p className="text-base font-bold">Не вдалося завантажити список</p>
          <p className="mx-auto mt-1.5 max-w-[40ch] text-ink-soft">
            Перевірте зʼєднання з інтернетом і спробуйте ще раз.
          </p>
          <button
            type="button"
            onClick={() => fetchPatients()}
            className="btn btn-tint btn-sm mt-3"
          >
            Спробувати ще раз
          </button>
        </div>
      ) : patients.length === 0 ? (
        trimmedQuery ? (
          <div className="w-full py-8 text-center text-ink-soft">
            <p>Нічого не знайдено за запитом «{shortQuery}».</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
              className="btn btn-ghost btn-sm mt-3"
            >
              Очистити пошук
            </button>
          </div>
        ) : (
          <p className="w-full py-8 text-center text-ink-soft">
            Записів ще немає.
          </p>
        )
      ) : (
        <>
          <div className="flex w-full flex-col gap-2.5">
            {patients.map((patient, index) => (
              <div
                key={patient._id}
                className="list-row anim-rise"
                style={
                  { "--stagger": Math.min(index, 10) } as React.CSSProperties
                }
              >
                <div className="min-w-0">
                  <div className="list-row-name">{patient.fullName}</div>
                </div>
                <div className="list-row-actions">
                  <button
                    type="button"
                    onClick={() => setEditingPatient(patient)}
                    className="btn btn-ghost btn-sm min-w-[110px] justify-center"
                  >
                    <IconEdit className="w-3.5 h-3.5 text-ink-soft" />
                    Редагувати
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeletingPatient(patient)}
                      className="btn btn-sm btn-danger-soft min-w-[110px] justify-center"
                    >
                      Видалити
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex w-full flex-wrap items-center justify-between gap-3">
            <span className="text-ink-soft text-xs tabular-nums">
              Показано {(page - 1) * PAGE_SIZE + 1}–
              {(page - 1) * PAGE_SIZE + patients.length} із {total}
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
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
                      type="button"
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
                  type="button"
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={page === totalPages}
                  aria-label="Наступна сторінка"
                  className="pager-btn text-ink-soft hover:bg-surface-2 hover:text-ink disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <PatientFormModal
        visible={Boolean(editingPatient)}
        onClose={() => setEditingPatient(null)}
        onSave={handleUpdatePatient}
        patient={editingPatient ?? { fullName: "" }}
        title="Редагувати дані пацієнта"
      />

      <ConfirmModal
        visible={Boolean(deletingPatient)}
        title="Видалити картку пацієнта"
        message={`Видалити картку пацієнта «${deletingPatient?.fullName ?? ""}»? Разом із нею буде видалено її рекомендаційний лист. Дію неможливо скасувати.`}
        isDanger
        isLoading={isDeleting}
        loadingLabel="Видаляємо…"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingPatient(null)}
      />
    </div>
  );
}
