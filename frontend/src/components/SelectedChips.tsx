import React from "react";

import { IconClose, IconEdit } from "#components/icons";

interface SelectedChipsProps<T extends { _id?: string }> {
  items: T[];
  getName: (item: T) => React.ReactNode;
  /** Підпис під назвою (напр. <FormattedText inline …/>). */
  getSub?: (item: T) => React.ReactNode;
  onRemove: (item: T) => void;
  onEdit?: (item: T) => void;
  editAriaLabel?: (item: T) => string;
  /** Додатковий вміст між текстом і кнопками (чекбокси тощо). */
  renderExtra?: (item: T, index: number) => React.ReactNode;
}

/**
 * Спільний список вибраних елементів у вигляді чипів:
 * назва + підпис, олівець редагування (опційно) і хрестик видалення.
 * Новий чип зʼявляється з анімацією .anim-rise.
 */
function SelectedChips<T extends { _id?: string }>({
  items,
  getName,
  getSub,
  onRemove,
  onEdit,
  editAriaLabel,
  renderExtra,
}: SelectedChipsProps<T>) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-ink-soft">Нічого не вибрано</p>;
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {items.map((item, index) => {
        const sub = getSub?.(item);
        const editLabel = editAriaLabel?.(item) ?? "Редагувати";

        return (
          <div key={item._id ?? index} className="chip-row anim-rise">
            <div className="min-w-0 flex-1">
              <div className="chip-name">{getName(item)}</div>
              {sub ? <div className="chip-sub">{sub}</div> : null}
            </div>
            {renderExtra?.(item, index)}
            {onEdit && (
              <button
                type="button"
                className="chip-action"
                title={editLabel}
                aria-label={editLabel}
                onClick={() => onEdit(item)}
              >
                <IconEdit />
              </button>
            )}
            <button
              type="button"
              className="chip-action"
              aria-label="Видалити"
              onClick={() => onRemove(item)}
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default SelectedChips;
