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
    <div className="flex w-full flex-col items-start justify-start">
      <div className="mb-3 flex w-full flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-green-700">
          Домашній догляд
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-md border border-green-300 px-3 py-2 text-sm font-medium text-green-700 transition-all hover:bg-green-50 active:scale-95"
          >
            Експортувати в CSV
          </button>

          {!readOnly && (
            <>
              <button
                type="button"
                onClick={handleImportClick}
                disabled={isImporting}
                className="rounded-md border border-green-300 px-3 py-2 text-sm font-medium text-green-700 transition-all hover:bg-green-50 active:scale-95 disabled:opacity-50"
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
        className="mb-4 w-full max-w-md rounded-md border border-green-300 px-3 py-2"
      />

      {!readOnly && (
        <div className="mb-4 flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center">
          <input
            placeholder="Назва"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="min-h-[38px] flex-1 rounded-md border border-green-300 px-2 py-[9px]"
          />

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={form.morning}
                onChange={(e) =>
                  setForm({ ...form, morning: e.target.checked })
                }
                className="accent-green-600"
              />
              Ранок
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={form.evening}
                onChange={(e) =>
                  setForm({ ...form, evening: e.target.checked })
                }
                className="accent-green-600"
              />
              Вечір
            </label>
          </div>

          <button
            onClick={handleSave}
            className={`h-[38px] rounded-md px-4 py-2 text-white font-medium transition-all active:scale-95 ${
              editingId
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {editingId ? "Оновити" : "Додати"}
          </button>

          {editingId && (
            <button
              onClick={resetForm}
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 font-medium transition-all hover:bg-gray-50 active:scale-95"
            >
              Скасувати
            </button>
          )}
        </div>
      )}

      <p className="mb-4 text-sm text-gray-500">
        {dragDisabled
          ? "Перетягування вимкнене під час пошуку, read-only режиму або збереження порядку."
          : "Перетягуйте рядки, щоб змінювати порядок у списку."}
      </p>

      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-green-300 bg-green-50">
              <th className="border border-green-200 px-4 py-2 text-left font-semibold text-green-700">
                Назва
              </th>
              <th className="border border-green-200 px-4 py-2 text-center font-semibold text-green-700">
                Ранок
              </th>
              <th className="border border-green-200 px-4 py-2 text-center font-semibold text-green-700">
                Вечір
              </th>
              {!readOnly && (
                <th className="border border-green-200 px-4 py-2 text-center font-semibold text-green-700 w-32">
                  Дії
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 3 : 4}
                  className="border border-green-200 px-4 py-3 text-center text-gray-500"
                >
                  Немає елементів
                </td>
              </tr>
            ) : (
              filteredList.map((item) => {
                const isDragged = draggedId === item._id;
                const isDropTarget = dragOverId === item._id;

                return (
                  <tr
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
                    className={`border-b border-green-200 hover:bg-green-50 ${
                      isDragged ? "opacity-50" : ""
                    } ${isDropTarget ? "bg-green-100" : ""} ${
                      dragDisabled ? "" : "cursor-grab active:cursor-grabbing"
                    }`}
                  >
                    <td className="border border-green-200 px-4 py-2 text-green-900">
                      {item.name}
                    </td>
                    <td className="border border-green-200 px-4 py-2 text-center text-green-900">
                      {item.morning ? "✓" : "–"}
                    </td>
                    <td className="border border-green-200 px-4 py-2 text-center text-green-900">
                      {item.evening ? "✓" : "–"}
                    </td>
                    {!readOnly && (
                      <td className="border border-green-200 px-4 py-2 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded bg-amber-500 px-3 py-1 text-white text-sm font-medium transition-all hover:bg-amber-600 active:scale-95"
                          >
                            Редагувати
                          </button>
                          <button
                            onClick={() => item._id && handleDelete(item._id)}
                            className="rounded bg-red-600 px-3 py-1 text-white text-sm font-medium transition-all hover:bg-red-700 active:scale-95"
                          >
                            Видалити
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
