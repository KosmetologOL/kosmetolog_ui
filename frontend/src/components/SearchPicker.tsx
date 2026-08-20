import React, { useEffect, useId, useState } from "react";
import toast from "react-hot-toast";

import Spinner from "#components/Spinner";
import { useDebouncedValue } from "#hooks/useDebouncedValue";

interface SearchPickerProps<T extends { _id?: string; name: string }> {
  /** Асинхронний пошук. Передавай стабільну функцію (напр. searchExamsByName). */
  search: (q: string) => Promise<T[]>;
  placeholder: string;
  onAdd: (item: T) => void;
  /** _id уже доданих елементів — ховаються з результатів. */
  selectedIds?: (string | undefined)[];
  /** Підпис під назвою (напр. <FormattedText inline …/>). */
  renderSub?: (item: T) => React.ReactNode;
  addLabel?: string;
  /** Додатковий вміст під «Нічого не знайдено». */
  emptyHint?: React.ReactNode;
}

/**
 * Спільний автокомпліт «пошук → додати» для довідникових ресурсів.
 * Дебаунс 400 мс, захист від гонки запитів, спінер-суфікс у полі,
 * керування з клавіатури (стрілки/Enter/Escape) і ARIA-розмітка комбобокса.
 * Після додавання пошук не скидається — лікар часто додає кілька поспіль.
 */
function SearchPicker<T extends { _id?: string; name: string }>({
  search,
  placeholder,
  onAdd,
  selectedIds,
  renderSub,
  addLabel = "Додати",
  emptyHint,
}: SearchPickerProps<T>) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const listboxId = useId();

  const debouncedQuery = useDebouncedValue(query, 400);

  /*
    Список вибраного часто лишається нижче за екран, тож без тосту не видно,
    чи елемент додався. Спільний id — щоб серія додавань поспіль оновлювала
    той самий тост, а не громадила стос.
  */
  const handleAdd = (item: T) => {
    onAdd(item);
    toast.success(`Додано: ${item.name}`, { id: "picker-added" });
  };

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setResults(null);
      setLoading(false);
      return;
    }

    let ignore = false;
    setLoading(true);
    search(q)
      .then((res) => {
        if (!ignore) setResults(res);
      })
      .catch(() => {
        if (!ignore) setResults([]);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedQuery, search]);

  useEffect(() => {
    setHighlighted(-1);
  }, [results]);

  const available = (results ?? []).filter(
    (item) => !selectedIds?.includes(item._id),
  );
  const isOpen = Boolean(query.trim()) && results !== null;
  const showList = isOpen && available.length > 0;
  const showEmpty = isOpen && !loading && available.length === 0;
  const activeIndex = Math.min(highlighted, available.length - 1);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (query) {
        e.preventDefault();
        setQuery("");
        setResults(null);
      }
      return;
    }
    if (!showList) {
      // Enter у полі пошуку не має сабмітити зовнішню форму звіту.
      if (e.key === "Enter" && query.trim()) e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted(activeIndex >= available.length - 1 ? 0 : activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted(activeIndex <= 0 ? available.length - 1 : activeIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) handleAdd(available[activeIndex]);
    }
  };

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && activeIndex >= 0
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`field-input${loading ? " pr-10" : ""}`}
        />
        {loading && (
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-soft">
            <Spinner />
          </span>
        )}
      </div>

      {showList && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={placeholder}
          className="select-content mt-2 flex flex-col gap-1.5"
        >
          {available.map((item, index) => {
            const sub = renderSub?.(item);
            const isActive = index === activeIndex;

            return (
              <button
                key={item._id ?? item.name}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => handleAdd(item)}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? "border-line-strong bg-brand-soft"
                    : "border-line bg-surface hover:border-line-strong hover:bg-surface-2"
                }`}
              >
                <span className="min-w-0">
                  <span className="block min-w-0 truncate text-sm font-bold">
                    {item.name}
                  </span>
                  {sub ? (
                    <span className="block text-xs text-ink-soft">{sub}</span>
                  ) : null}
                </span>
                <span className="btn btn-tint btn-sm flex-none">{addLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {showEmpty && (
        <div className="select-content mt-2">
          <p className="text-sm text-ink-soft">Нічого не знайдено</p>
          {emptyHint}
        </div>
      )}
    </div>
  );
}

export default SearchPicker;
