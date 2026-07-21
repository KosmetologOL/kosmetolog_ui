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
      <p className="section-label">Категорії довідників</p>
      <div className="mb-5 flex w-full flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field-input min-w-[200px] flex-1"
          placeholder="Назва категорії"
        />
        <button onClick={add} className="btn btn-primary">
          {editingId ? "Оновити" : "Додати"}
        </button>
        {editingId && (
          <button
            onClick={() => {
              setEditingId(null);
              setName("");
            }}
            className="btn btn-ghost"
          >
            Скасувати
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {cats.map((c) => (
          <div key={c._id} className="list-row">
            <div className="list-row-name">{c.name}</div>
            <div className="list-row-actions">
              <button onClick={() => edit(c)} className="btn btn-ghost btn-sm">
                Редагувати
              </button>
              <button
                onClick={() => remove(c._id)}
                className="btn btn-ghost btn-sm text-danger"
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
