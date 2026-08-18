import {
  createHomeCare,
  deleteHomeCare,
  getAllHomeCares,
  type IHomeCare,
  reorderHomeCares,
  updateHomeCare,
} from "#api/homeCaresApi";
import ConfirmModal from "#components/ConfirmModal";
import { IconEdit, IconPlus, IconSearch } from "#components/icons";
import ReferenceItemModal from "#components/ReferenceItemModal";
import { plural } from "#lib/plural";
import { downloadCsv, parseCsv, toCsv } from "#lib/csv";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

const parseCsvBoolean = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized === "так" || normalized === "1" || normalized === "true";
};

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  if (!movedItem) {
    return items;
  }

  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

// Grip-іконка перетягування (два стовпчики крапок)
const GripIcon = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <circle cx="5.5" cy="3.5" r="1.3" />
    <circle cx="10.5" cy="3.5" r="1.3" />
    <circle cx="5.5" cy="8" r="1.3" />
    <circle cx="10.5" cy="8" r="1.3" />
    <circle cx="5.5" cy="12.5" r="1.3" />
    <circle cx="10.5" cy="12.5" r="1.3" />
  </svg>
);

export default function HomeCaresManager({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const [list, setList] = useState<IHomeCare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<IHomeCare | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<
    { name: string; morning: boolean; evening: boolean }[] | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchList = useCallback(async () => {
    try {
      const data = await getAllHomeCares();
      setList(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredList = list.filter((item) =>
    item.name.toLowerCase().includes(normalizedSearch),
  );

  const handleSaveModal = async (form: {
    name: string;
    recommendation?: string;
    morning?: boolean;
    evening?: boolean;
  }) => {
    if (!form.name.trim()) return;

    try {
      if (editingItem?._id) {
        await updateHomeCare(editingItem._id, {
          name: form.name,
          morning: form.morning,
          evening: form.evening,
        });
      } else {
        await createHomeCare({
          name: form.name,
          morning: form.morning,
          evening: form.evening,
        });
      }

      setIsModalOpen(false);
      setEditingItem(null);
      toast.success("Запис збережено.");
      void fetchList();
    } catch {
      toast.error("Не вдалося зберегти запис. Спробуйте ще раз.");
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: IHomeCare) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteHomeCare(deletingId);
      setDeletingId(null);
      toast.success("Запис видалено.");
      void fetchList();
    } catch {
      toast.error("Не вдалося видалити запис. Спробуйте ще раз.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Спільне збереження нового порядку — і для drag-and-drop, і для кнопок-стрілок
  const persistOrder = async (nextList: IHomeCare[]) => {
    setList(nextList);
    setIsSavingOrder(true);

    try {
      const ids = nextList
        .map((item) => item._id)
        .filter((id): id is string => Boolean(id));

      await reorderHomeCares(ids);
    } catch {
      toast.error("Не вдалося зберегти порядок. Спробуйте ще раз.");
      void fetchList();
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId || isSavingOrder || readOnly) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const fromIndex = list.findIndex((item) => item._id === draggedId);
    const toIndex = list.findIndex((item) => item._id === targetId);

    setDraggedId(null);
    setDragOverId(null);

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    await persistOrder(moveItem(list, fromIndex, toIndex));
  };

  const handleMove = async (id: string, direction: -1 | 1) => {
    if (readOnly || isSavingOrder) return;

    const fromIndex = list.findIndex((item) => item._id === id);
    if (fromIndex === -1) return;

    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= list.length) return;

    await persistOrder(moveItem(list, fromIndex, toIndex));
  };

  const handleExportCsv = () => {
    const header = ["Назва", "Ранок", "Вечір"];
    const rows = list.map((item) => [
      item.name,
      item.morning ? "Так" : "Ні",
      item.evening ? "Так" : "Ні",
    ]);

    downloadCsv("Домашній догляд.csv", toCsv(header, rows));
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    e.target.value = "";
    const rawText = await file.text();
    const text =
      rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
    const rows = parseCsv(text);

    if (rows.length === 0) {
      toast.error("Файл порожній або має некоректний формат.");
      return;
    }

    const firstRow = rows[0]?.map((col) => col.toLowerCase());
    const hasHeader =
      firstRow?.includes("назва") ||
      firstRow?.includes("ранок") ||
      firstRow?.includes("вечір");
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const parsed: { name: string; morning: boolean; evening: boolean }[] = [];

    for (const row of dataRows) {
      const name = row[0]?.trim();

      if (!name) {
        continue;
      }

      parsed.push({
        name,
        morning: parseCsvBoolean(row[1] || ""),
        evening: parseCsvBoolean(row[2] || ""),
      });
    }

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
      for (const item of pendingImport) {
        const existing = list.find(
          (current) =>
            current.name.trim().toLowerCase() === item.name.toLowerCase(),
        );

        if (existing?._id) {
          await updateHomeCare(existing._id, item);
        } else {
          await createHomeCare(item);
        }
      }

      await fetchList();
      toast.success(
        `Успішно імпортовано ${pendingImport.length} ${plural(
          pendingImport.length,
          ["запис", "записи", "записів"],
        )}.`,
      );
    } catch {
      toast.error(
        "Під час імпорту сталася помилка. Частина записів могла не оновитися.",
      );
    } finally {
      setIsImporting(false);
      setPendingImport(null);
    }
  };

  const dragDisabled = readOnly || Boolean(normalizedSearch) || isSavingOrder;

  return (
    <div className="flex w-full flex-col items-start">
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="panel-title">Домашній догляд</h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            {normalizedSearch
              ? `Знайдено: ${filteredList.length} з ${list.length}`
              : `Усього: ${list.length}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn btn-primary btn-sm"
            >
              <IconPlus />
              Додати запис
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-ghost btn-sm"
          >
            Вивантажити існуючі
          </button>

          {!readOnly && (
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
        </div>
      </div>

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

      {!readOnly && (
        <p className="mb-4 text-xs text-ink-soft">
          {dragDisabled
            ? "Перетягування вимкнене під час пошуку або збереження порядку."
            : "Перетягуйте картки або користуйтеся стрілками, щоб змінювати порядок у списку."}
        </p>
      )}

      {isLoading ? (
        <div className="flex w-full flex-col gap-2.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="list-row">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-4 w-44 max-w-full" />
                <div className="skeleton mt-2.5 h-3 w-40 max-w-full" />
              </div>
              {!readOnly && (
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
            {readOnly
              ? "Записів ще немає."
              : "Записів ще немає. Натисніть «Додати запис»."}
          </p>
        )
      ) : (
        <div className="flex w-full flex-col gap-2.5">
          {filteredList.map((item, index) => {
            const isDragging = draggedId === item._id;
            const isDragOver = dragOverId === item._id;

            return (
              <div
                key={item._id}
                draggable={!dragDisabled}
                onDragStart={() => setDraggedId(item._id ?? null)}
                onDragOver={(e) => {
                  if (dragDisabled) return;
                  e.preventDefault();
                  setDragOverId(item._id ?? null);
                }}
                onDragLeave={() => {
                  if (dragOverId === item._id) {
                    setDragOverId(null);
                  }
                }}
                onDrop={() => item._id && void handleDrop(item._id)}
                className={`list-row anim-rise transition-all ${
                  !dragDisabled ? "cursor-grab active:cursor-grabbing" : ""
                } ${isDragging ? "opacity-40" : ""} ${
                  isDragOver ? "border-brand bg-brand-soft/20" : ""
                }`}
                style={{ "--stagger": Math.min(index, 10) } as React.CSSProperties}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  {!dragDisabled && (
                    <span className="shrink-0 text-ink-soft" aria-hidden="true">
                      <GripIcon />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="list-row-name">{item.name}</span>
                      <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                        <span className={`pill ${item.morning ? "is-on" : ""}`}>
                          Ранок
                        </span>
                        <span className={`pill ${item.evening ? "is-on" : ""}`}>
                          Вечір
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {!readOnly && (
                  <div className="list-row-actions mt-3 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-line/60">
                    {!normalizedSearch && (
                      <>
                        <button
                          type="button"
                          onClick={() => item._id && void handleMove(item._id, -1)}
                          disabled={isSavingOrder || index === 0}
                          aria-label="Перемістити вище"
                          className="icon-btn text-ink-soft hover:bg-surface-2 hover:text-ink"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="m6 14 6-6 6 6" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => item._id && void handleMove(item._id, 1)}
                          disabled={isSavingOrder || index === filteredList.length - 1}
                          aria-label="Перемістити нижче"
                          className="icon-btn text-ink-soft hover:bg-surface-2 hover:text-ink"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="m6 10 6 6 6-6" />
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="btn btn-ghost btn-sm flex-1 sm:flex-initial sm:min-w-[110px] justify-center"
                    >
                      <IconEdit className="w-3.5 h-3.5 text-ink-soft" />
                      Редагувати
                    </button>
                    <button
                      onClick={() => item._id && setDeletingId(item._id)}
                      className="btn btn-sm btn-danger-soft flex-1 sm:flex-initial sm:min-w-[110px] justify-center"
                    >
                      Видалити
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ReferenceItemModal
        visible={isModalOpen}
        title={editingItem ? "Редагувати — Домашній догляд" : "Новий запис — Домашній догляд"}
        submitLabel={editingItem ? "Зберегти зміни" : "Додати"}
        showTimeOfDayOptions={true}
        showRecommendation={false}
        item={{
          name: editingItem?.name ?? "",
          morning: editingItem?.morning ?? false,
          evening: editingItem?.evening ?? false,
        }}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveModal}
      />

      <ConfirmModal
        visible={Boolean(deletingId)}
        title="Видалити домашній догляд"
        message="Ви впевнені, що хочете видалити цей запис? Цю дію неможливо скасувати."
        isLoading={isDeleting}
        loadingLabel="Видаляємо…"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />

      <ConfirmModal
        visible={Boolean(pendingImport)}
        title="Імпорт CSV"
        message={`Імпортувати ${pendingImport?.length ?? 0} ${plural(pendingImport?.length ?? 0, ["запис", "записи", "записів"])}? Записи з існуючою назвою будуть оновлені, решта — додані.`}
        confirmLabel="Імпортувати"
        isDanger={false}
        isLoading={isImporting}
        loadingLabel="Імпортуємо…"
        onConfirm={handleConfirmImport}
        onCancel={() => setPendingImport(null)}
      />
    </div>
  );
}
