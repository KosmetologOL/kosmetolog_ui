import React, { useEffect, useRef } from "react";

import { IconClose } from "#components/icons";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  /** id заголовка всередині children — для aria-labelledby. */
  labelledBy?: string;
  /** Tailwind-клас максимальної ширини панелі. */
  maxWidth?: string;
  /** Блокує Escape, клік по бекдропу і кнопку-хрестик (на час запиту). */
  closeDisabled?: boolean;
  /** Додаткові класи панелі (напр. "p-7" чи "max-h-[90vh]"). */
  panelClassName?: string;
  showCloseButton?: boolean;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Спільний каркас модалки: оверлей, панель із enter-анімацією (.modal-panel),
 * кнопка-хрестик, закриття по Escape і по кліку на бекдроп, блокування скролу
 * сторінки, focus trap і повернення фокуса на елемент-тригер після закриття.
 * Вміст (шапка/тіло/футер, падінги) повністю віддано children.
 */
const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  labelledBy,
  maxWidth = "max-w-md",
  closeDisabled = false,
  panelClassName = "",
  showCloseButton = true,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!visible) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    const autofocusTarget =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel?.querySelector<HTMLElement>(FOCUSABLE);
    (autofocusTarget ?? panel)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closeDisabled) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE)
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panel)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, closeDisabled, onClose]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !closeDisabled) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`modal-panel relative flex w-full ${maxWidth} flex-col overflow-hidden rounded-2xl bg-surface shadow-lift outline-none ${panelClassName}`}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Закрити"
            className="icon-btn absolute top-4 right-4 z-10 rounded-full! text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            <IconClose />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal;
