import {
  createCategoryItem,
  deleteCategoryItem,
  listCategoryItems,
  updateCategoryItem,
} from "#api/referenceApi";
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
    <div className="flex w-full flex-col items-start">
      <p className="section-label">{categoryName}</p>

      <input
        placeholder="Пошук"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="field-input mb-4 max-w-md"
      />

      <div className="mb-5 flex w-full flex-wrap items-start gap-3">
        <input
          placeholder="Назва"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="field-input min-w-[200px] flex-1"
        />

        <textarea
          placeholder="Рекомендація"
          value={form.recommendation}
          onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
          className="field-textarea min-w-[200px] flex-1 h-12 resize-none overflow-hidden"
          rows={1}
        />

        <button onClick={handleSave} className="btn btn-primary">
          {editingId ? "Оновити" : "Додати"}
        </button>

        {editingId && (
          <button onClick={handleCancel} className="btn btn-ghost">
            Скасувати
          </button>
        )}
      </div>

      {filteredList.length === 0 ? (
        <p className="w-full py-8 text-center text-ink-soft">
          Немає елементів
        </p>
      ) : (
        <div className="flex w-full flex-col gap-2.5">
          {filteredList.map((item) => (
            <div key={item._id} className="list-row">
              <div className="min-w-0">
                <div className="list-row-name">{item.name}</div>
                {item.recommendation && (
                  <div className="list-row-sub whitespace-pre-wrap">
                    {item.recommendation}
                  </div>
                )}
              </div>
              <div className="list-row-actions">
                <button
                  onClick={() => handleEdit(item)}
                  className="btn btn-ghost btn-sm"
                >
                  Редагувати
                </button>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="btn btn-ghost btn-sm text-danger"
                >
                  Видалити
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryItemsManager;
