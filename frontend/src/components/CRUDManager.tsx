import { createReferenceApi } from "#api/createReferenceApi";
import ConfirmModal from "#components/ConfirmModal";
import FormattedText from "#components/FormattedText";
import { IconEdit, IconPlus, IconSearch } from "#components/icons";
import ReferenceItemModal from "#components/ReferenceItemModal";
import { useDebouncedValue } from "#hooks/useDebouncedValue";
import { plural } from "#lib/plural";
import { matchesNameQuery } from "#lib/translitSearch";
import { downloadCsv, parseCsv, toCsv } from "#lib/csv";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";

interface CRUDItem {
  _id?: string;
  name: string;
  recommendation?: string;
  morning?: boolean;
  evening?: boolean;
}

const IMPORT_BATCH_SIZE = 15;

// Довідники бувають на сотні записів — рендеримо їх порціями, щоб відкриття
// вкладки не впиралося в разовий рендер усього списку.
const VISIBLE_STEP = 50;

// Виконує worker для кожного item пачками по IMPORT_BATCH_SIZE замість
// повністю послідовно — на сотнях записів це в рази швидше, а onProgress
// все одно оновлюється по кожному завершеному item, а не по пачці.
const runInBatches = async <T,>(
  items: T[],
  worker: (item: T) => Promise<void>,
  onProgress: (done: number) => void,
): Promise<void> => {
  let done = 0;
  for (let i = 0; i < items.length; i += IMPORT_BATCH_SIZE) {
    const batch = items.slice(i, i + IMPORT_BATCH_SIZE);
    await Promise.all(
      batch.map(async (item) => {
        await worker(item);
        done += 1;
        onProgress(done);
      }),
    );
  }
};

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
  const api = useMemo(() => createReferenceApi<T, unknown>(apiPath), [apiPath]);
  const [list, setList] = useState<CRUDItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP);
  const [editingItem, setEditingItem] = useState<CRUDItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<
    { phase: "deleting" | "creating"; done: number; total: number } | null
  >(null);
  const [pendingImport, setPendingImport] = useState<
    { name: string; recommendation: string }[] | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedSearch = debouncedSearch.trim();
  const filteredList = list.filter((item) => {
    if (!normalizedSearch) {
      return true;
    }

    return [item.name, item.recommendation]
      .filter(Boolean)
      .some((value) => matchesNameQuery(value!, normalizedSearch));
  });

  const fetchList = useCallback(async () => {
    try {
      // Деякі ресурси повертають масив напряму, інші — обгортку
      // виду { items: [...] }; шукаємо перший масив у відповіді.
      const data = (await api.getAll()) as unknown;

      let raw: unknown = data;
      if (!Array.isArray(raw)) {
        const foundArray = Object.values(
          (raw ?? {}) as Record<string, unknown>,
        ).find((value) => Array.isArray(value));
        if (foundArray) {
          raw = foundArray;
        }
      }

      const items = Array.isArray(raw) ? raw : [];
      setList(mapItem ? (items as T[]).map(mapItem) : (items as CRUDItem[]));
    } finally {
      setIsLoading(false);
    }
  }, [api, mapItem]);

  useEffect(() => {
    setVisibleCount(VISIBLE_STEP);
  }, [normalizedSearch]);

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

    try {
      if (editingItem?._id) {
        await api.update(editingItem._id, payload);
      } else {
        await api.create(payload);
      }

      setIsModalOpen(false);
      setEditingItem(null);
      toast.success("Запис збережено.");
      void fetchList();
    } catch {
      toast.error("Не вдалося зберегти запис. Спробуйте ще раз.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await api.remove(deletingId);
      setDeletingId(null);
      toast.success("Запис видалено.");
      void fetchList();
    } catch {
      toast.error("Не вдалося видалити запис. Спробуйте ще раз.");
    } finally {
      setIsDeleting(false);
    }
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
    downloadCsv(`${title}.csv`, toCsv(header, rows));
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
      toast.error("У файлі немає колонки «Назва».");
      return;
    }

    const parsed = dataRows
      .map((cols) => ({
        name: (cols[nameIdx] ?? "").trim(),
        recommendation: recIdx >= 0 ? (cols[recIdx] ?? "").trim() : "",
      }))
      .filter((row) => row.name && (!hasRecommendation || row.recommendation));

    if (parsed.length === 0) {
      toast.error(
        hasRecommendation
          ? "У файлі немає рядків із заповненими назвою та рекомендацією."
          : "У файлі немає рядків із заповненою назвою.",
      );
      return;
    }

    const skipped = dataRows.length - parsed.length;
    if (skipped > 0) {
      toast(
        `Пропущено ${skipped} ${plural(skipped, ["рядок", "рядки", "рядків"])} із порожньою назвою або рекомендацією.`,
        { icon: "⚠️" },
      );
    }

    setPendingImport(parsed);
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;

    // Спочатку видаляємо всі старі записи, потім створюємо нові з файлу.
    // Порядок навмисний: назва має unique-індекс у базі (див. *Schema.ts),
    // а після редагування в Excel назви майже завжди лишаються тими самими,
    // тож створення нового запису до видалення старого впаде на дублікаті.
    const oldItemsWithId = list.filter((item) => item._id);

    setIsImporting(true);
    try {
      setImportProgress({
        phase: "deleting",
        done: 0,
        total: oldItemsWithId.length,
      });
      await runInBatches(
        oldItemsWithId,
        async (item) => {
          await api.remove(item._id!);
        },
        (done) =>
          setImportProgress({
            phase: "deleting",
            done,
            total: oldItemsWithId.length,
          }),
      );

      setImportProgress({
        phase: "creating",
        done: 0,
        total: pendingImport.length,
      });
      await runInBatches(
        pendingImport,
        async (row) => {
          const payload = hasRecommendation
            ? { name: row.name, recommendation: row.recommendation }
            : { name: row.name };
          await api.create(payload);
        },
        (done) =>
          setImportProgress({
            phase: "creating",
            done,
            total: pendingImport.length,
          }),
      );

      await fetchList();
      toast.success(
        `Попередні записи видалено, імпортовано ${pendingImport.length} ${plural(
          pendingImport.length,
          ["новий запис", "нові записи", "нових записів"],
        )}.`,
      );
    } catch {
      await fetchList();
      toast.error(
        "Під час імпорту сталася помилка. Старі записи вже видалено — перевірте список і за потреби довантажте файл ще раз.",
      );
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      setPendingImport(null);
    }
  };

  return (
    <div className="flex w-full flex-col items-start">
      {/* Header toolbar */}
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="panel-title">{title}</h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            {normalizedSearch
              ? `Знайдено: ${filteredList.length} з ${list.length}`
              : `Усього: ${list.length}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {editable && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn btn-primary btn-sm"
            >
              <IconPlus />
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
                Вивантажити існуючі
              </button>

              {editable && (
                <>
                  <button
                    type="button"
                    onClick={handleImportClick}
                    disabled={isImporting}
                    className="btn btn-ghost btn-sm"
                  >
                    {isImporting ? "Імпортуємо…" : "Завантажити нові"}
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
        <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-soft pointer-events-none" />
        <input
          type="text"
          placeholder="Пошук записів…"
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

      {isLoading ? (
        <div className="flex w-full flex-col gap-2.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="list-row">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-4 w-44 max-w-full" />
                <div className="skeleton mt-2.5 h-3 w-72 max-w-full" />
              </div>
              {showActions && (
                <div className="list-row-actions">
                  <div className="skeleton h-9.5 w-[110px]" />
                  <div className="skeleton h-9.5 w-[110px]" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : filteredList.length === 0 ? (
        normalizedSearch ? (
          <div className="w-full py-8 text-center text-ink-soft">
            <p>Нічого не знайдено за запитом «{debouncedSearch.trim()}».</p>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="btn btn-ghost btn-sm mt-3"
            >
              Очистити пошук
            </button>
          </div>
        ) : (
          <p className="w-full py-8 text-center text-ink-soft">
            {editable
              ? "Записів ще немає. Натисніть «Додати запис»."
              : "Записів ще немає."}
          </p>
        )
      ) : (
        <>
          <div className="flex w-full flex-col gap-2.5">
            {filteredList.slice(0, visibleCount).map((item, index) => (
              <div
                key={item._id}
                className="list-row anim-rise"
                style={
                  { "--stagger": Math.min(index, 10) } as React.CSSProperties
                }
              >
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
                        <IconEdit className="w-3.5 h-3.5 text-ink-soft" />
                        Редагувати
                      </button>
                    )}
                    {deletable && (
                      <button
                        onClick={() => setDeletingId(item._id || null)}
                        className="btn btn-sm btn-danger-soft min-w-[110px] justify-center"
                      >
                        Видалити
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredList.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + VISIBLE_STEP)}
              className="btn btn-ghost btn-sm mt-3 self-center"
            >
              Показати ще ({filteredList.length - visibleCount})
            </button>
          )}
        </>
      )}

      <ReferenceItemModal
        visible={isModalOpen}
        title={editingItem ? `Редагувати — ${title}` : `Новий запис — ${title}`}
        submitLabel={editingItem ? "Зберегти зміни" : "Додати"}
        showRecommendation={!!hasRecommendation}
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
        isLoading={isDeleting}
        loadingLabel="Видаляємо…"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />

      <ConfirmModal
        visible={Boolean(pendingImport)}
        title="Імпорт CSV"
        message={`Усі поточні записи (${list.length}) буде видалено і замінено на ${pendingImport?.length ?? 0} ${plural(pendingImport?.length ?? 0, ["запис", "записи", "записів"])} із файлу. Цю дію неможливо скасувати.`}
        confirmLabel="Замінити записи"
        isDanger={true}
        isLoading={isImporting}
        loadingLabel={
          importProgress
            ? importProgress.phase === "deleting"
              ? `Видаляємо старі… ${importProgress.done}/${importProgress.total}`
              : `Завантажуємо нові… ${importProgress.done}/${importProgress.total}`
            : "Обробляємо…"
        }
        onConfirm={handleConfirmImport}
        onCancel={() => setPendingImport(null)}
      />
    </div>
  );
};

export default CRUDManager;
