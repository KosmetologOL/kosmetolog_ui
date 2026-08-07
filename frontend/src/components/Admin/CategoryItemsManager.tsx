import {
  createCategoryItem,
  deleteCategoryItem,
  listCategoryItems,
  updateCategory,
  updateCategoryItem,
  type CategoryReportPosition,
  type ICategoryItem,
} from "#api/referenceApi";
import ConfirmModal from "#components/ConfirmModal";
import FormattedText from "#components/FormattedText";
import { IconEdit, IconPlus, IconSearch } from "#components/icons";
import ReferenceItemModal from "#components/ReferenceItemModal";
import Select from "#components/Select";
import { plural } from "#lib/plural";
import { downloadCsv, parseCsv, toCsv } from "#lib/csv";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

const IMPORT_BATCH_SIZE = 15;

// Пачками по IMPORT_BATCH_SIZE замість повністю послідовно — на сотнях
// записів це в рази швидше, а onProgress все одно оновлюється по кожному
// завершеному item, а не по пачці.
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

const REPORT_POSITION_OPTIONS: { value: CategoryReportPosition; label: string }[] = [
  { value: "after_specialists", label: "Після «Суміжні спеціалісти»" },
  { value: "after_exams", label: "Після «Обстеження»" },
  { value: "after_medications", label: "Після «Засоби»" },
  { value: "after_homecare", label: "Після «Домашній догляд»" },
  { value: "after_procedure_stages", label: "Після «Протокол процедур»" },
  { value: "after_procedures", label: "Після «Рекомендації щодо процедур»" },
];

interface Props {
  categoryId: string;
  categoryName: string;
  showNameInReport?: boolean;
  reportPosition?: CategoryReportPosition;
  importantNote?: string;
}

const CategoryItemsManager: React.FC<Props> = ({
  categoryId,
  categoryName,
  showNameInReport,
  reportPosition,
  importantNote,
}) => {
  const [items, setItems] = useState<ICategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<ICategoryItem | null>(null);
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
  const [noteDraft, setNoteDraft] = useState(importantNote ?? "");
  const noteFieldId = `category-note-${categoryId}`;

  useEffect(() => {
    setNoteDraft(importantNote ?? "");
  }, [categoryId, importantNote]);

  const handleUpdateSettings = async (
    nextShowNameInReport: boolean,
    nextReportPosition: CategoryReportPosition,
    nextImportantNote?: string,
  ) => {
    try {
      await updateCategory(
        categoryId,
        categoryName,
        nextShowNameInReport,
        nextReportPosition,
        nextImportantNote ?? importantNote ?? "",
      );
      window.dispatchEvent(new CustomEvent("categoriesUpdated"));
      toast.success("Налаштування категорії збережено.");
    } catch {
      // Відкат чернетки тексту до збереженого значення
      setNoteDraft(importantNote ?? "");
      toast.error("Не вдалося зберегти налаштування категорії. Спробуйте ще раз.");
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredList = items.filter((item) => {
    if (!normalizedSearch) return true;
    return [item.name, item.recommendation]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedSearch));
  });

  const load = useCallback(async () => {
    try {
      const list = await listCategoryItems(categoryId);
      setItems(list || []);
    } catch {
      toast.error("Не вдалося завантажити записи категорії.");
    } finally {
      setIsLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (form: { name: string; recommendation?: string }) => {
    if (!form.name.trim()) return;

    try {
      if (editingItem?._id) {
        await updateCategoryItem(editingItem._id, form.name, form.recommendation);
      } else {
        await createCategoryItem(categoryId, form.name, form.recommendation);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      toast.success("Запис збережено.");
      void load();
    } catch {
      toast.error("Не вдалося зберегти запис. Спробуйте ще раз.");
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ICategoryItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteCategoryItem(deletingId);
      setDeletingId(null);
      toast.success("Запис видалено.");
      void load();
    } catch {
      toast.error("Не вдалося видалити запис. Спробуйте ще раз.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCsv = () => {
    const header = ["Назва", "Рекомендація"];
    const rows = items.map((item) => [item.name, item.recommendation ?? ""]);
    downloadCsv(`${categoryName}.csv`, toCsv(header, rows));
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const rawText = await file.text();
    const text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
    const rows = parseCsv(text);

    if (rows.length < 2) {
      toast.error("Файл порожній або не містить рядків з даними.");
      return;
    }

    const [header, ...dataRows] = rows;
    const nameIdx = header.findIndex((h) => h.trim().toLowerCase() === "назва");
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
      .filter((row) => row.name);

    if (parsed.length === 0) {
      toast.error("У файлі немає рядків із заповненою назвою.");
      return;
    }

    const skipped = dataRows.length - parsed.length;
    if (skipped > 0) {
      toast(
        `Пропущено ${skipped} ${plural(skipped, ["рядок", "рядки", "рядків"])} із порожньою назвою.`,
        { icon: "⚠️" },
      );
    }

    setPendingImport(parsed);
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;

    // Спочатку видаляємо всі старі записи категорії, потім створюємо нові з файлу.
    const oldItems = items;

    setIsImporting(true);
    try {
      setImportProgress({ phase: "deleting", done: 0, total: oldItems.length });
      await runInBatches(
        oldItems,
        async (item) => {
          await deleteCategoryItem(item._id);
        },
        (done) => setImportProgress({ phase: "deleting", done, total: oldItems.length }),
      );

      setImportProgress({ phase: "creating", done: 0, total: pendingImport.length });
      await runInBatches(
        pendingImport,
        async (row) => {
          await createCategoryItem(categoryId, row.name, row.recommendation);
        },
        (done) =>
          setImportProgress({ phase: "creating", done, total: pendingImport.length }),
      );

      await load();
      toast.success(
        `Попередні записи видалено, імпортовано ${pendingImport.length} ${plural(
          pendingImport.length,
          ["новий запис", "нові записи", "нових записів"],
        )}.`,
      );
    } catch {
      await load();
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
          <h2 className="panel-title">{categoryName}</h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            {normalizedSearch
              ? `Знайдено: ${filteredList.length} з ${items.length}`
              : `Усього: ${items.length}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn btn-primary btn-sm"
          >
            <IconPlus />
            Додати запис
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-ghost btn-sm"
          >
            Експорт CSV
          </button>

          <button
            type="button"
            onClick={handleImportClick}
            disabled={isImporting}
            className="btn btn-ghost btn-sm"
          >
            {isImporting ? "Імпортуємо…" : "Імпорт CSV"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      {/* Report display settings */}
      <div className="mb-5 flex w-full flex-wrap items-center gap-x-5 gap-y-3 border-b border-line pb-4">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-line-strong transition-colors duration-150 has-[:checked]:bg-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/30 has-[:focus-visible]:ring-offset-2">
            <input
              type="checkbox"
              role="switch"
              checked={showNameInReport ?? true}
              onChange={(e) =>
                handleUpdateSettings(
                  e.target.checked,
                  reportPosition ?? "after_homecare",
                )
              }
              className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <span className="pointer-events-none absolute left-0.5 h-4 w-4 rounded-full bg-surface shadow-sm transition-transform duration-150 peer-checked:translate-x-4" />
          </span>
          <span className="text-sm font-medium text-ink">
            Показувати назву у сформованому звіті
          </span>
        </label>

        <span className="hidden h-4 w-px bg-line sm:block" aria-hidden="true" />

        <label className="inline-flex items-center gap-2.5">
          <span className="text-sm text-ink-soft">Розташування у звіті</span>
          <Select
            value={reportPosition ?? "after_homecare"}
            onValueChange={(value) =>
              handleUpdateSettings(
                showNameInReport ?? true,
                value as CategoryReportPosition,
              )
            }
            options={REPORT_POSITION_OPTIONS}
            className="h-9 w-auto"
          />
        </label>
      </div>

      {/* Важливий текст — автоматично додається блоком "!" під цією категорією у звіті */}
      <div className="mb-5 w-full border-b border-line pb-4">
        <label
          htmlFor={noteFieldId}
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Важливий текст для розділу
        </label>
        <textarea
          id={noteFieldId}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onBlur={() => {
            if (noteDraft !== (importantNote ?? "")) {
              handleUpdateSettings(
                showNameInReport ?? true,
                reportPosition ?? "after_homecare",
                noteDraft,
              );
            }
          }}
          rows={3}
          placeholder="Важливо…"
          className="field-textarea w-full min-h-[80px] resize-y"
        />
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
              <div className="list-row-actions">
                <div className="skeleton h-9.5 w-[110px]" />
                <div className="skeleton h-9.5 w-[110px]" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredList.length === 0 ? (
        normalizedSearch ? (
          <div className="w-full py-8 text-center text-ink-soft">
            <p>Нічого не знайдено за запитом «{search.trim()}».</p>
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
            Записів ще немає. Натисніть «Додати запис».
          </p>
        )
      ) : (
        <div className="flex w-full flex-col gap-2.5">
          {filteredList.map((item, index) => (
            <div
              key={item._id}
              className="list-row anim-rise"
              style={{ "--stagger": Math.min(index, 10) } as React.CSSProperties}
            >
              <div className="min-w-0">
                <div className="list-row-name">{item.name}</div>
                {item.recommendation && (
                  <div className="list-row-sub whitespace-pre-wrap">
                    <FormattedText markdown={item.recommendation} />
                  </div>
                )}
              </div>
              <div className="list-row-actions">
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="btn btn-ghost btn-sm min-w-[110px] justify-center"
                >
                  <IconEdit className="w-3.5 h-3.5 text-ink-soft" />
                  Редагувати
                </button>
                <button
                  onClick={() => setDeletingId(item._id)}
                  className="btn btn-sm btn-danger-soft min-w-[110px] justify-center"
                >
                  Видалити
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReferenceItemModal
        visible={isModalOpen}
        title={editingItem ? `Редагувати — ${categoryName}` : `Новий запис — ${categoryName}`}
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
        title={`Видалити — ${categoryName}`}
        message="Ви впевнені, що хочете видалити цей запис? Цю дію неможливо скасувати."
        isLoading={isDeleting}
        loadingLabel="Видаляємо…"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />

      <ConfirmModal
        visible={Boolean(pendingImport)}
        title="Імпорт CSV"
        message={`Усі поточні записи (${items.length}) у категорії «${categoryName}» буде видалено і замінено на ${pendingImport?.length ?? 0} ${plural(pendingImport?.length ?? 0, ["запис", "записи", "записів"])} із файлу. Цю дію неможливо скасувати.`}
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

export default CategoryItemsManager;
