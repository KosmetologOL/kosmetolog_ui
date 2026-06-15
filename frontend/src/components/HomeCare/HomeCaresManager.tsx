import {
  createHomeCare,
  deleteHomeCare,
  getAllHomeCares,
  type IHomeCare,
  reorderHomeCares,
  updateHomeCare,
} from "#api/homeCaresApi";
import { useEffect, useState } from "react";

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

  const dragDisabled = readOnly || Boolean(normalizedSearch) || isSavingOrder;

  return (
    <div className="flex w-full flex-col items-start justify-start">
      <h2 className="mb-3 text-lg font-semibold text-green-700">
        Домашній догляд
      </h2>

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
