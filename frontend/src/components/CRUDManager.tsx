import ConfirmModal from "#components/ConfirmModal";
import FormattedText from "#components/FormattedText";
import ReferenceItemModal from "#components/ReferenceItemModal";
import { downloadCsv, parseCsv, toCsv } from "#types/csv";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

interface CRUDItem {
  _id?: string;
  name: string;
  recommendation?: string;
  morning?: boolean;
  evening?: boolean;
}

interface Props<T> {
  title: string;
  apiPath: string;
  hasRecommendation?: boolean;
  hasMorningEvening?: boolean;
  readOnly?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  enableCsvImportExport?: boolean;
  mapItem?: (item: T) => CRUDItem;
  mapToApi?: (item: CRUDItem) => unknown;
}

const CRUDManager = <T,>({
  title,
  apiPath,
  hasRecommendation,
  hasMorningEvening,
  readOnly = false,
  canEdit,
  canDelete,
  enableCsvImportExport = false,
  mapItem,
  mapToApi,
}: Props<T>) => {
  const editable = canEdit ?? !readOnly;
  const deletable = canDelete ?? !readOnly;
  const showActions = editable || deletable;
  const [list, setList] = useState<CRUDItem[]>([]);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<CRUDItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<
    { name: string; recommendation: string }[] | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredList = list.filter((item) => {
    if (!normalizedSearch) {
      return true;
    }

    return [item.name, item.recommendation]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedSearch));
  });

  const fetchList = useCallback(async () => {
    const { data } = await axios.get<T[]>(
      `${import.meta.env.VITE_API_URL}/${apiPath}`,
    );

    let raw = data;

    if (!Array.isArray(raw)) {
      const foundArray = Object.values(raw).find((value) =>
        Array.isArray(value),
      );
      if (foundArray) {
        raw = foundArray as T[];
      }
    }

    setList(mapItem ? (raw as T[]).map(mapItem) : (raw as CRUDItem[]));
  }, [apiPath, mapItem]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    const handler = () => {
      void fetchList();
    };
    window.addEventListener("categoriesUpdated", handler as EventListener);
    return () =>
      window.removeEventListener("categoriesUpdated", handler as EventListener);
  }, [fetchList]);

  const handleSave = async (formItem: { name: string; recommendation?: string }) => {
    if (!formItem.name.trim()) {
      return;
    }

    const payload = mapToApi ? mapToApi(formItem as CRUDItem) : formItem;

    if (editingItem?._id) {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/${apiPath}/${editingItem._id}`,
        payload,
      );
    } else {
      await axios.post(`${import.meta.env.VITE_API_URL}/${apiPath}`, payload);
    }

    setIsModalOpen(false);
    setEditingItem(null);
    void fetchList();
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    await axios.delete(`${import.meta.env.VITE_API_URL}/${apiPath}/${deletingId}`);
    setDeletingId(null);
    void fetchList();
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CRUDItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleExportCsv = () => {
    const header = hasRecommendation ? ["Назва", "Рекомендація"] : ["Назва"];
    const rows = list.map((item) =>
      hasRecommendation
        ? [item.name, item.recommendation ?? ""]
        : [item.name],
    );
    downloadCsv(`${apiPath}.csv`, toCsv(header, rows));
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const rawText = await file.text();
    const text =
      rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
    const rows = parseCsv(text);

    if (rows.length < 2) {
      toast.error("Файл порожній або не містить рядків з даними.");
      return;
    }

    const [header, ...dataRows] = rows;
    const nameIdx = header.findIndex(
      (h) => h.trim().toLowerCase() === "назва",
    );
    const recIdx = header.findIndex(
      (h) => h.trim().toLowerCase() === "рекомендація",
    );

    if (nameIdx === -1) {
      toast.error('У файлі немає колонки "Назва".');
      return;
    }

    const parsed = dataRows
      .map((cols) => ({
        name: (cols[nameIdx] ?? "").trim(),
        recommendation: recIdx >= 0 ? (cols[recIdx] ?? "").trim() : "",
      }))
      .filter((row) => row.name);

    if (parsed.length === 0) {
      toast.error("У файлі немає рядків із заповненою назвою.");
      return;
    }

    setPendingImport(parsed);
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;

    setIsImporting(true);
    try {
      for (const row of pendingImport) {
        const existing = list.find(
          (item) => item.name.trim().toLowerCase() === row.name.toLowerCase(),
        );
        const payload = hasRecommendation
          ? { name: row.name, recommendation: row.recommendation }
          : { name: row.name };

        if (existing?._id) {
          await axios.put(
            `${import.meta.env.VITE_API_URL}/${apiPath}/${existing._id}`,
            payload,
          );
        } else {
          await axios.post(`${import.meta.env.VITE_API_URL}/${apiPath}`, payload);
        }
      }
      await fetchList();
      toast.success(`Успішно імпортовано ${pendingImport.length} записів!`);
    } catch {
      toast.error("Під час імпорту сталася помилка. Частина записів могла не оновитися.");
    } finally {
      setIsImporting(false);
      setPendingImport(null);
    }
  };

  return (
    <div className="flex w-full flex-col items-start">
      {/* Header toolbar */}
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[21px] tracking-[0.08em] uppercase font-bold text-ink">
            {title}
          </h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Усього записів: {filteredList.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {editable && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn btn-primary btn-sm"
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
              Додати запис
            </button>
          )}

          {enableCsvImportExport && (
            <>
              <button
                type="button"
                onClick={handleExportCsv}
                className="btn btn-ghost btn-sm"
              >
                Експорт CSV
              </button>

              {editable && (
                <>
                  <button
                    type="button"
                    onClick={handleImportClick}
                    disabled={isImporting}
                    className="btn btn-ghost btn-sm"
                  >
                    {isImporting ? "Імпорт..." : "Імпорт CSV"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Search input bar */}
      <div className="relative mb-5 w-full max-w-md">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-soft pointer-events-none"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.8-3.8" />
        </svg>
        <input
          type="text"
          placeholder="Пошук записів..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field-input pl-10 pr-9 w-full"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Очистити пошук"
            className="icon-btn absolute right-1.5 top-1/2 -translate-y-1/2 text-lg text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            ×
          </button>
        )}
      </div>

      {filteredList.length === 0 ? (
        <p className="w-full py-8 text-center text-ink-soft">
          Немає елементів
        </p>
      ) : (
        <div className="ref-list flex w-full flex-col gap-2.5">
          {filteredList.map((item) => (
            <div key={item._id} className="list-row">
              <div className="min-w-0">
                <div className="list-row-name">{item.name}</div>
                {hasRecommendation && item.recommendation && (
                  <div className="list-row-sub">
                    <FormattedText
                      markdown={item.recommendation}
                      className="text-[13.5px]"
                    />
                  </div>
                )}
                {hasMorningEvening && (
                  <div className="mt-2 flex gap-1.5">
                    <span className={`pill ${item.morning ? "is-on" : ""}`}>
                      Ранок
                    </span>
                    <span className={`pill ${item.evening ? "is-on" : ""}`}>
                      Вечір
                    </span>
                  </div>
                )}
              </div>
              {showActions && (
                <div className="list-row-actions">
                  {editable && (
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="btn btn-ghost btn-sm min-w-[110px] justify-center"
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
                      Редагувати
                    </button>
                  )}
                  {deletable && (
                    <button
                      onClick={() => setDeletingId(item._id || null)}
                      className="btn btn-sm min-w-[110px] justify-center bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25"
                    >
                      Видалити
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ReferenceItemModal
        visible={isModalOpen}
        title={editingItem ? `Редагувати — ${title}` : `Новий запис — ${title}`}
        submitLabel={editingItem ? "Зберегти зміни" : "Додати"}
        item={{
          name: editingItem?.name ?? "",
          recommendation: editingItem?.recommendation ?? "",
        }}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
      />

      <ConfirmModal
        visible={Boolean(deletingId)}
        title={`Видалити — ${title}`}
        message="Ви впевнені, що хочете видалити цей запис? Цю дію неможливо скасувати."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />

      <ConfirmModal
        visible={Boolean(pendingImport)}
        title="Імпорт CSV"
        message={`Імпортувати ${pendingImport?.length ?? 0} записів? Записи з існуючою назвою будуть оновлені, решта — додані.`}
        confirmLabel="Імпортувати"
        isDanger={false}
        onConfirm={handleConfirmImport}
        onCancel={() => setPendingImport(null)}
      />
    </div>
  );
};

export default CRUDManager;
