import {
  createHomeCare,
  deleteHomeCare,
  getAllHomeCares,
  type IHomeCare,
  reorderHomeCares,
  updateHomeCare,
} from "#api/homeCaresApi";
import ConfirmModal from "#components/ConfirmModal";
import ReferenceItemModal from "#components/ReferenceItemModal";
import { downloadCsv, parseCsv, toCsv } from "#types/csv";
import { useEffect, useRef, useState } from "react";
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

export default function HomeCaresManager({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const [list, setList] = useState<IHomeCare[]>([]);
  const [editingItem, setEditingItem] = useState<IHomeCare | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchList = async () => {
    const data = await getAllHomeCares();
    setList(data);
  };

  useEffect(() => {
    void fetchList();
  }, []);

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
    void fetchList();
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
    await deleteHomeCare(deletingId);
    setDeletingId(null);
    void fetchList();
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId || isSavingOrder || readOnly) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const fromIndex = list.findIndex((item) => item._id === draggedId);
    const toIndex = list.findIndex((item) => item._id === targetId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const nextList = moveItem(list, fromIndex, toIndex);
    setList(nextList);
    setDraggedId(null);
    setDragOverId(null);
    setIsSavingOrder(true);

    try {
      const ids = nextList
        .map((item) => item._id)
        .filter((id): id is string => Boolean(id));

      await reorderHomeCares(ids);
    } catch {
      void fetchList();
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleExportCsv = () => {
    const header = ["Назва", "Ранок", "Вечір"];
    const rows = list.map((item) => [
      item.name,
      item.morning ? "Так" : "Ні",
      item.evening ? "Так" : "Ні",
    ]);

    downloadCsv("домашній-догляд.csv", toCsv(header, rows));
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
    const text = await file.text();
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

    setIsImporting(true);

    try {
      for (const item of parsed) {
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
      toast.success(`Успішно імпортовано ${parsed.length} записів!`);
    } catch {
      toast.error(
        "Під час імпорту сталася помилка. Частина записів могла не оновитися.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const dragDisabled = readOnly || Boolean(normalizedSearch) || isSavingOrder;

  return (
    <div className="flex w-full flex-col items-start">
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[21px] tracking-[0.08em] uppercase font-bold text-ink">
            Домашній догляд
          </h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Усього записів: {filteredList.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!readOnly && (
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

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-ghost btn-sm"
          >
            Експорт CSV
          </button>

          {!readOnly && (
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
        </div>
      </div>

      <div className="relative mb-4 w-full max-w-md">
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

      <p className="mb-4 text-xs text-ink-soft">
        {dragDisabled
          ? "Перетягування вимкнене під час пошуку або збереження порядку."
          : "Перетягуйте картки, щоб змінювати порядок у списку."}
      </p>

      {filteredList.length === 0 ? (
        <p className="w-full py-8 text-center text-ink-soft">
          Немає елементів
        </p>
      ) : (
        <div className="flex w-full flex-col gap-2.5">
          {filteredList.map((item) => {
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
                className={`list-row transition-all ${
                  isDragging ? "opacity-40" : ""
                } ${isDragOver ? "border-brand bg-brand-soft/20" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="list-row-name text-[15.5px] font-bold text-ink">
                      {item.name}
                    </span>
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
                {!readOnly && (
                  <div className="list-row-actions mt-3 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-line/60">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="btn btn-ghost btn-sm flex-1 sm:flex-initial sm:min-w-[110px] justify-center"
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
                    <button
                      onClick={() => item._id && setDeletingId(item._id)}
                      className="btn btn-sm flex-1 sm:flex-initial sm:min-w-[110px] justify-center bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25"
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
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
