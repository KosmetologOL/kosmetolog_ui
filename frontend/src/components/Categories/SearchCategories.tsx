import {
  getCategories,
  listCategoryItems,
  type ICategory,
  type ICategoryItem,
} from "#api/referenceApi";
import ExpandableText from "#components/ExpandableText";
import ReferenceItemModal from "#components/ReferenceItemModal";
import { useEffect, useState } from "react";

export interface IReportCategoryItem {
  _id: string;
  categoryId?: string;
  categoryName: string;
  itemName: string;
  recommendation?: string;
}

interface Props {
  selectedCategoryItems: IReportCategoryItem[];
  setSelectedCategoryItems: React.Dispatch<
    React.SetStateAction<IReportCategoryItem[]>
  >;
}

const SearchCategories: React.FC<Props> = ({
  selectedCategoryItems,
  setSelectedCategoryItems,
}) => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [itemsByCategory, setItemsByCategory] = useState<
    Record<string, ICategoryItem[]>
  >({});
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<IReportCategoryItem | null>(
    null,
  );

  const loadCategories = async () => {
    try {
      setLoading(true);
      const cats = await getCategories();
      setCategories(cats || []);

      const itemsEntries = await Promise.all(
        (cats || []).map(async (cat) => {
          const items = await listCategoryItems(cat._id);
          return [cat._id, items || []] as const;
        }),
      );

      setItemsByCategory(Object.fromEntries(itemsEntries));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();

    const handler = () => void loadCategories();
    window.addEventListener("categoriesUpdated", handler);
    return () => window.removeEventListener("categoriesUpdated", handler);
  }, []);

  const handleSearchChange = (categoryId: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [categoryId]: value }));
  };

  const addItem = (category: ICategory, item: ICategoryItem) => {
    setSelectedCategoryItems((prev) => [
      ...prev,
      {
        _id: crypto.randomUUID(),
        categoryId: category._id,
        categoryName: category.name,
        itemName: item.name,
        recommendation: item.recommendation || "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    setSelectedCategoryItems((prev) => prev.filter((i) => i._id !== id));
  };

  const handleSaveEdit = (updated: { name: string; recommendation?: string }) => {
    if (!editingItem) return;

    setSelectedCategoryItems((prev) =>
      prev.map((item) =>
        item._id === editingItem._id
          ? {
              ...item,
              itemName: updated.name,
              recommendation: updated.recommendation ?? "",
            }
          : item,
      ),
    );
    setEditingItem(null);
  };

  if (loading) {
    return <p className="text-sm text-ink-soft">Завантаження категорій...</p>;
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Категорій ще немає. Додайте їх у розділі «Довідники → Категорії».
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {categories.map((category) => {
        const items = itemsByCategory[category._id] || [];
        const search = (searchValues[category._id] || "").trim().toLowerCase();
        const filteredItems = search
          ? items.filter((item) => item.name.toLowerCase().includes(search))
          : items;

        const currentSelected = selectedCategoryItems.filter(
          (i) => i.categoryId === category._id,
        );

        return (
          <div
            key={category._id}
            className="rounded-xl border border-line bg-surface-2 p-4"
          >
            <p className="mb-3 text-[15px] font-bold">{category.name}</p>

            <input
              type="text"
              placeholder="Пошук..."
              value={searchValues[category._id] || ""}
              onChange={(e) => handleSearchChange(category._id, e.target.value)}
              className="field-input"
            />

            {items.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">
                У цій категорії ще немає записів.
              </p>
            ) : (
              filteredItems.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {filteredItems.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[14.5px] font-bold text-ink">
                          {item.name}
                        </div>
                        {item.recommendation && (
                          <div className="text-xs text-ink-soft mt-1 leading-relaxed whitespace-pre-wrap">
                            <ExpandableText
                              text={item.recommendation}
                              limit={120}
                            />
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => addItem(category, item)}
                        className="btn btn-tint btn-sm px-4"
                      >
                        + Додати
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {currentSelected.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 pt-3 border-t border-line/70">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Вибрано для «{category.name}»:
                </p>
                {currentSelected.map((item) => (
                  <div
                    key={item._id}
                    className="chip-row flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-surface rounded-xl border border-line p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="chip-name font-bold text-ink text-[14.5px]">
                        {item.itemName}
                      </div>
                      {item.recommendation && (
                        <div className="chip-sub mt-0.5 text-xs text-ink-soft whitespace-pre-wrap leading-relaxed">
                          <ExpandableText
                            text={item.recommendation}
                            limit={120}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm px-2.5"
                        title="Редагувати запис"
                        aria-label="Редагувати запис"
                        onClick={() => setEditingItem(item)}
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
                      </button>
                      <button
                        type="button"
                        className="chip-remove"
                        aria-label="Видалити"
                        onClick={() => removeItem(item._id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <ReferenceItemModal
        visible={Boolean(editingItem)}
        title="Редагувати запис"
        submitLabel="Зберегти"
        recommendationLabel="Рекомендації"
        item={{
          name: editingItem?.itemName ?? "",
          recommendation: editingItem?.recommendation ?? "",
        }}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default SearchCategories;
