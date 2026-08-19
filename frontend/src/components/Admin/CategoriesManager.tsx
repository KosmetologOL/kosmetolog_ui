import {
  createCategory,
  deleteCategory,
  getCategories,
  type ICategory,
  updateCategory,
} from "#api/referenceApi";
import ConfirmModal from "#components/ConfirmModal";
import { IconEdit, IconPlus, IconSearch } from "#components/icons";
import ReferenceItemModal from "#components/ReferenceItemModal";
import { matchesNameQuery } from "#lib/translitSearch";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const CategoriesManager: React.FC = () => {
  const [cats, setCats] = useState<ICategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingCat, setEditingCat] = useState<ICategory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await getCategories();
      setCats(c || []);
      // Сповіщаємо інші компоненти (таби довідників) про зміни категорій
      window.dispatchEvent(
        new CustomEvent("categoriesUpdated", { detail: c || [] }),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const normalizedSearch = search.trim();
  const filteredCats = cats.filter((c) =>
    matchesNameQuery(c.name, normalizedSearch),
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
      toast.success("Категорію збережено.");
      void load();
    } catch {
      toast.error("Не вдалося зберегти категорію. Спробуйте ще раз.");
    }
  };

  const handleOpenCreate = () => {
    setEditingCat(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: ICategory) => {
    setEditingCat(c);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteCategory(deletingId);
      setDeletingId(null);
      toast.success("Категорію видалено.");
      void load();
    } catch {
      toast.error("Не вдалося видалити категорію. Спробуйте ще раз.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-start">
      {/* Header toolbar */}
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="panel-title">Категорії довідників</h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            {normalizedSearch
              ? `Знайдено: ${filteredCats.length} з ${cats.length}`
              : `Усього: ${cats.length}`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="btn btn-primary btn-sm"
        >
          <IconPlus />
          Додати категорію
        </button>
      </div>

      {/* Search input bar */}
      <div className="relative mb-5 w-full max-w-md">
        <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-soft pointer-events-none" />
        <input
          type="text"
          placeholder="Пошук категорій…"
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

      {isLoading ? (
        <div className="flex w-full flex-col gap-2.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="list-row">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-4 w-44 max-w-full" />
              </div>
              <div className="list-row-actions">
                <div className="skeleton h-9.5 w-[110px]" />
                <div className="skeleton h-9.5 w-[110px]" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCats.length === 0 ? (
        normalizedSearch ? (
          <div className="w-full py-8 text-center text-ink-soft">
            <p>Нічого не знайдено за запитом «{search.trim()}».</p>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="btn btn-ghost btn-sm mt-3"
            >
              Очистити пошук
            </button>
          </div>
        ) : (
          <p className="w-full py-8 text-center text-ink-soft">
            Категорій ще немає. Натисніть «Додати категорію».
          </p>
        )
      ) : (
        <div className="flex flex-col gap-2.5 w-full">
          {filteredCats.map((c, index) => (
            <div
              key={c._id}
              className="list-row anim-rise"
              style={{ "--stagger": Math.min(index, 10) } as React.CSSProperties}
            >
              <div className="list-row-name">{c.name}</div>
              <div className="list-row-actions">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="btn btn-ghost btn-sm min-w-[110px] justify-center"
                >
                  <IconEdit className="w-3.5 h-3.5 text-ink-soft" />
                  Редагувати
                </button>
                <button
                  onClick={() => setDeletingId(c._id)}
                  className="btn btn-sm btn-danger-soft min-w-[110px] justify-center"
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
        showRecommendation={false}
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
        isLoading={isDeleting}
        loadingLabel="Видаляємо…"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};

export default CategoriesManager;
