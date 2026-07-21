import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "#api/referenceApi";
import ConfirmModal from "#components/ConfirmModal";
import ReferenceItemModal from "#components/ReferenceItemModal";
import React, { useEffect, useState } from "react";

const CategoriesManager: React.FC = () => {
  const [cats, setCats] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCats = cats.filter((c) =>
    c.name.toLowerCase().includes(normalizedSearch),
  );

  const handleSaveModal = async (form: { name: string; recommendation?: string }) => {
    if (!form.name.trim()) return;

    try {
      if (editingCat?._id) {
        await updateCategory(editingCat._id, form.name.trim());
      } else {
        await createCategory(form.name.trim());
      }
      setIsModalOpen(false);
      setEditingCat(null);
      void load();
    } catch (err) {
      console.error("Помилка при збереженні категорії:", err);
    }
  };

  const handleOpenCreate = () => {
    setEditingCat(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingCat(c);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    await deleteCategory(deletingId);
    setDeletingId(null);
    void load();
  };

  return (
    <div className="flex w-full flex-col items-start">
      {/* Header toolbar */}
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[21px] tracking-[0.08em] uppercase font-bold text-ink">
            Категорії довідників
          </h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Усього категорій: {filteredCats.length}
          </p>
        </div>

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
          Додати категорію
        </button>
      </div>

      {/* Search input bar */}
      <div className="relative mb-5 w-full max-w-md">
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
          placeholder="Пошук категорій..."
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

      {filteredCats.length === 0 ? (
        <p className="w-full py-8 text-center text-ink-soft">
          Немає категорій
        </p>
      ) : (
        <div className="flex flex-col gap-2.5 w-full">
          {filteredCats.map((c) => (
            <div key={c._id} className="list-row">
              <div className="list-row-name">{c.name}</div>
              <div className="list-row-actions">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="btn btn-ghost btn-sm min-w-[110px] justify-center"
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
                  onClick={() => setDeletingId(c._id)}
                  className="btn btn-sm min-w-[110px] justify-center bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25"
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
        title={editingCat ? "Редагувати категорію" : "Нова категорія довідника"}
        submitLabel={editingCat ? "Зберегти зміни" : "Додати"}
        item={{
          name: editingCat?.name ?? "",
        }}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCat(null);
        }}
        onSave={handleSaveModal}
      />

      <ConfirmModal
        visible={Boolean(deletingId)}
        title="Видалити категорію"
        message="Ви впевнені, що хочете видалити цю категорію? Цю дію неможливо скасувати."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};

export default CategoriesManager;
