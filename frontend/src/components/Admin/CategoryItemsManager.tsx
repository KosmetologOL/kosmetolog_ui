import {
  createCategoryItem,
  deleteCategoryItem,
  listCategoryItems,
  updateCategoryItem,
} from "#api/adminApi";
import React, { useEffect, useState } from "react";

interface Props {
  categoryId: string;
  categoryName: string;
}

const CategoryItemsManager: React.FC<Props> = ({
  categoryId,
  categoryName,
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", recommendation: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredList = items.filter((item) => {
    if (!normalizedSearch) return true;
    return [item.name, item.recommendation]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearch));
  });

  const load = async () => {
    try {
      const list = await listCategoryItems(categoryId);
      setItems(list || []);
    } catch (err) {
      console.error("Failed to load category items:", err);
    }
  };

  useEffect(() => {
    void load();
  }, [categoryId]);

  const handleSave = async () => {
    if (!form.name.trim()) return;

    try {
      if (editingId) {
        await updateCategoryItem(editingId, form.name, form.recommendation);
        setEditingId(null);
      } else {
        await createCategoryItem(categoryId, form.name, form.recommendation);
      }
      setForm({ name: "", recommendation: "" });
      void load();
    } catch (err) {
      console.error("Error saving:", err);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item._id);
    setForm({ name: item.name, recommendation: item.recommendation || "" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цей елемент?")) return;
    try {
      await deleteCategoryItem(id);
      void load();
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ name: "", recommendation: "" });
  };

  return (
    <div className="flex flex-col items-start justify-start">
      <h2 className="mb-3 text-lg font-semibold text-green-700">
        {categoryName}
      </h2>

      <input
        placeholder="Пошук"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-md rounded-md border border-green-300 px-3 py-2"
      />

      <div className="mb-4 flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center">
        <input
          placeholder="Назва"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="min-h-[38px] flex-1 rounded-md border border-green-300 px-2 py-[9px]"
        />

        <textarea
          placeholder="Рекомендація"
          value={form.recommendation}
          onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
          className="min-h-[38px] flex-1 resize-none overflow-hidden rounded-md border border-green-300 px-2 py-[9px] leading-[1.4]"
          rows={1}
        />

        <button
          onClick={handleSave}
          className="whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-white font-medium transition-all hover:bg-green-700 active:scale-95"
        >
          {editingId ? "Оновити" : "Додати"}
        </button>

        {editingId && (
          <button
            onClick={handleCancel}
            className="whitespace-nowrap rounded-md border border-gray-300 px-4 py-2 text-gray-700 font-medium transition-all hover:bg-gray-50 active:scale-95"
          >
            Скасувати
          </button>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-green-300 bg-green-50">
              <th className="border border-green-200 px-4 py-2 text-left font-semibold text-green-700">
                Назва
              </th>
              <th className="border border-green-200 px-4 py-2 text-left font-semibold text-green-700">
                Рекомендація
              </th>
              <th className="border border-green-200 px-4 py-2 text-center font-semibold text-green-700 w-32">
                Дії
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="border border-green-200 px-4 py-3 text-center text-gray-500"
                >
                  Немає елементів
                </td>
              </tr>
            ) : (
              filteredList.map((item) => (
                <tr
                  key={item._id}
                  className="border-b border-green-200 hover:bg-green-50"
                >
                  <td className="border border-green-200 px-4 py-2 text-green-900">
                    {item.name}
                  </td>
                  <td className="border border-green-200 px-4 py-2 text-gray-700 whitespace-pre-wrap text-sm max-w-md">
                    {item.recommendation || "-"}
                  </td>
                  <td className="border border-green-200 px-4 py-2 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEdit(item)}
                        className="rounded bg-amber-500 px-3 py-1 text-white text-sm font-medium transition-all hover:bg-amber-600 active:scale-95"
                      >
                        Редагувати
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="rounded bg-red-600 px-3 py-1 text-white text-sm font-medium transition-all hover:bg-red-700 active:scale-95"
                      >
                        Видалити
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategoryItemsManager;
