import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "#api/referenceApi";
import React, { useEffect, useState } from "react";

const CategoriesManager: React.FC = () => {
  const [cats, setCats] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const c = await getCategories();
    setCats(c || []);
    // cache and notify other components
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__categories = c || [];
    window.dispatchEvent(
      new CustomEvent("categoriesUpdated", { detail: c || [] }),
    );
  };

  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    try {
      if (editingId) {
        await updateCategory(editingId, name.trim());
        setEditingId(null);
      } else {
        await createCategory(name.trim());
      }
      setName("");
      void load();
    } catch (err) {
      console.error("Помилка:", err);
    }
  };

  const edit = (c: any) => {
    setEditingId(c._id);
    setName(c.name);
  };

  const remove = async (id: string) => {
    if (!window.confirm("Видалити цю категорію?")) return;
    await deleteCategory(id);
    void load();
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-green-700">
        Категорії довідників
      </h2>
      <div className="mb-4 flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-[38px] flex-1 rounded-md border border-green-300 px-2 py-[9px]"
          placeholder="Назва категорії"
        />
        <button
          onClick={add}
          className="rounded-md bg-green-600 px-4 py-2 text-white font-medium transition-all hover:bg-green-700 active:scale-95"
        >
          {editingId ? "Оновити" : "Додати"}
        </button>
        {editingId && (
          <button
            onClick={() => {
              setEditingId(null);
              setName("");
            }}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 font-medium transition-all hover:bg-gray-50 active:scale-95"
          >
            Скасувати
          </button>
        )}
      </div>

      <div className="space-y-2">
        {cats.map((c) => (
          <div
            key={c._id}
            className="flex items-center justify-between rounded border border-green-200 bg-green-50 p-3"
          >
            <div className="font-medium text-green-700">{c.name}</div>
            <div className="flex gap-2">
              <button
                onClick={() => edit(c)}
                className="rounded-md bg-amber-500 px-3 py-1.5 text-white text-sm font-medium transition-all hover:bg-amber-600 active:scale-95"
              >
                Редагувати
              </button>
              <button
                onClick={() => remove(c._id)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-white text-sm font-medium transition-all hover:bg-red-700 active:scale-95"
              >
                Видалити
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesManager;
