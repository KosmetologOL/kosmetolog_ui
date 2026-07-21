import {
  createHomeCare,
  deleteHomeCare,
  getAllHomeCares,
  type IHomeCare,
  reorderHomeCares,
  updateHomeCare,
} from "#api/homeCaresApi";
import { downloadCsv, parseCsv, toCsv } from "#types/csv";
import { useEffect, useRef, useState } from "react";

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
  const [form, setForm] = useState({
    name: "",
    morning: false,
    evening: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      morning: false,
      evening: false,
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      return;
    }

    if (editingId) {
      await updateHomeCare(editingId, form);
    } else {
      await createHomeCare(form);
    }

    resetForm();
    void fetchList();
  };

  const handleEdit = (item: IHomeCare) => {
    setEditingId(item._id ?? null);
    setForm({
      name: item.name,
      morning: item.morning,
      evening: item.evening,
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цей елемент?")) {
      return;
    }

    await deleteHomeCare(id);

    if (editingId === id) {
      resetForm();
    }

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

    const previousList = list;
    const nextList = moveItem(list, fromIndex, toIndex);

    setList(nextList);
    setDraggedId(null);
    setDragOverId(null);
    setIsSavingOrder(true);

    try {
      const reordered = await reorderHomeCares(
        nextList.map((item) => item._id).filter(Boolean) as string[],
      );
      setList(reordered);
    } catch {
      setList(previousList);
      window.alert("Не вдалося зберегти новий порядок.");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleExportCsv = () => {
    const header = ["Назва", "Ранок", "Вечір", "Засіб", "Рекомендації"];
    const rows = list.map((item) => [
      item.name,
      item.morning ? "так" : "ні",
      item.evening ? "так" : "ні",
      item.medicationName ?? "",
      item.recommendations ?? "",
    ]);
    downloadCsv("home-cares.csv", toCsv(header, rows));
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
      window.alert("Файл порожній або не містить рядків з даними.");
      return;
    }

    const [header, ...dataRows] = rows;
    const nameIdx = header.findIndex((h) => h.trim().toLowerCase() === "назва");
    const morningIdx = header.findIndex(
      (h) => h.trim().toLowerCase() === "ранок",
    );
    const eveningIdx = header.findIndex(
      (h) => h.trim().toLowerCase() === "вечір",
    );
    const medicationIdx = header.findIndex(
      (h) => h.trim().toLowerCase() === "засіб",
    );
    const recIdx = header.findIndex(
      (h) => h.trim().toLowerCase() === "рекомендації",
    );

    if (nameIdx === -1) {
      window.alert('У файлі немає колонки "Назва".');
      return;
    }

    const parsed = dataRows
      .map((cols) => ({
        name: (cols[nameIdx] ?? "").trim(),
        morning: morningIdx >= 0 ? parseCsvBoolean(cols[morningIdx] ?? "") : false,
        evening: eveningIdx >= 0 ? parseCsvBoolean(cols[eveningIdx] ?? "") : false,
        medicationName:
          medicationIdx >= 0 ? (cols[medicationIdx] ?? "").trim() : "",
        recommendations: recIdx >= 0 ? (cols[recIdx] ?? "").trim() : "",
      }))
      .filter((row) => row.name);

    if (parsed.length === 0) {
      window.alert("У файлі немає рядків із заповненою назвою.");
      return;
    }

    if (
      !window.confirm(
        `Імпортувати ${parsed.length} записів? Записи з існуючою назвою будуть оновлені, решта — додані.`,
      )
    ) {
      return;
    }

    setIsImporting(true);
    try {
      for (const row of parsed) {
        const existing = list.find(
          (item) => item.name.trim().toLowerCase() === row.name.toLowerCase(),
        );
        if (existing?._id) {
          await updateHomeCare(existing._id, row);
        } else {
          await createHomeCare(row);
        }
      }
      await fetchList();
      window.alert("Імпорт завершено.");
    } catch {
      window.alert(
        "Під час імпорту сталася помилка. Частина записів могла не оновитися.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const dragDisabled = readOnly || Boolean(normalizedSearch) || isSavingOrder;

  return (
    <div className="flex w-full flex-col items-start">
      <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-3">
        <p className="section-label mb-0">Домашній догляд</p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-ghost btn-sm"
          >
            Експортувати в CSV
          </button>

          {!readOnly && (
            <>
              <button
                type="button"
                onClick={handleImportClick}
                disabled={isImporting}
                className="btn btn-ghost btn-sm"
              >
                {isImporting ? "Імпортування..." : "Імпортувати з CSV"}
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

      <input
        placeholder="Пошук"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="field-input mb-4 max-w-md"
      />

      {!readOnly && (
        <div className="mb-5 flex w-full flex-wrap items-center gap-3">
          <input
            placeholder="Назва"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="field-input min-w-[200px] flex-1"
          />

          <div className="flex items-center gap-3.5 text-sm text-ink-soft">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={form.morning}
                onChange={(e) =>
                  setForm({ ...form, morning: e.target.checked })
                }
              />
              Ранок
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={form.evening}
                onChange={(e) =>
                  setForm({ ...form, evening: e.target.checked })
                }
              />
              Вечір
            </label>
          </div>

          <button onClick={handleSave} className="btn btn-primary">
            {editingId ? "Оновити" : "Додати"}
          </button>

          {editingId && (
            <button onClick={resetForm} className="btn btn-ghost">
              Скасувати
            </button>
          )}
        </div>
      )}

      <p className="mb-4 text-sm text-ink-soft">
        {dragDisabled
          ? "Перетягування вимкнене під час пошуку, read-only режиму або збереження порядку."
          : "Перетягуйте картки, щоб змінювати порядок у списку."}
      </p>

      {filteredList.length === 0 ? (
        <p className="w-full py-8 text-center text-ink-soft">
          Немає елементів
        </p>
      ) : (
        <div className="flex w-full flex-col gap-2.5">
          {filteredList.map((item) => {
            const isDragged = draggedId === item._id;
            const isDropTarget = dragOverId === item._id;

            return (
              <div
                key={item._id || item.name}
                draggable={!dragDisabled}
                onDragStart={() => setDraggedId(item._id ?? null)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                onDragOver={(e) => {
                  if (dragDisabled) {
                    return;
                  }

                  e.preventDefault();
                  setDragOverId(item._id ?? null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (item._id) {
                    void handleDrop(item._id);
                  }
                }}
                className={`list-row transition-opacity ${
                  isDragged ? "opacity-50" : ""
                } ${isDropTarget ? "bg-surface-2" : ""} ${
                  dragDisabled ? "" : "cursor-grab active:cursor-grabbing"
                }`}
              >
                <div className="min-w-0">
                  <div className="list-row-name">{item.name}</div>
                  <div className="mt-2 flex gap-1.5">
                    <span className={`pill ${item.morning ? "is-on" : ""}`}>
                      Ранок
                    </span>
                    <span className={`pill ${item.evening ? "is-on" : ""}`}>
                      Вечір
                    </span>
                  </div>
                </div>
                {!readOnly && (
                  <div className="list-row-actions">
                    <button
                      onClick={() => handleEdit(item)}
                      className="btn btn-ghost btn-sm"
                    >
                      Редагувати
                    </button>
                    <button
                      onClick={() => item._id && handleDelete(item._id)}
                      className="btn btn-ghost btn-sm text-danger"
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
    </div>
  );
}
