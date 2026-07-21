import {
  createCategoryItem,
  deleteCategoryItem,
  listCategoryItems,
  updateCategoryItem,
} from "#api/referenceApi";
import ConfirmModal from "#components/ConfirmModal";
import ExpandableText from "#components/ExpandableText";
import ReferenceItemModal from "#components/ReferenceItemModal";
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
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleSave = async (form: { name: string; recommendation?: string }) => {
    if (!form.name.trim()) return;

    try {
      if (editingItem?._id) {
        await updateCategoryItem(editingItem._id, form.name, form.recommendation);
      } else {
        await createCategoryItem(categoryId, form.name, form.recommendation);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      void load();
    } catch (err) {
      console.error("Error saving:", err);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteCategoryItem(deletingId);
      setDeletingId(null);
      void load();
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  return (
    <div className="flex w-full flex-col items-start">
      {/* Header toolbar */}
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[21px] tracking-[0.08em] uppercase font-bold text-ink">
            {categoryName}
          </h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Усього записів: {filteredList.length}
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
          Додати запис
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
                    <ExpandableText text={item.recommendation} />
                  </div>
                )}
              </div>
              <div className="list-row-actions">
                <button
                  onClick={() => handleOpenEdit(item)}
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
                  onClick={() => setDeletingId(item._id)}
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
        title={editingItem ? `Редагувати — ${categoryName}` : `Новий запис — ${categoryName}`}
        submitLabel={editingItem ? "Зберегти зміни" : "Додати"}
        item={{
          name: editingItem?.name ?? "",
          recommendation: editingItem?.recommendation ?? "",
        }}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
      />

      <ConfirmModal
        visible={Boolean(deletingId)}
        title={`Видалити — ${categoryName}`}
        message="Ви впевнені, що хочете видалити цей запис? Цю дію неможливо скасувати."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};

export default CategoryItemsManager;
