import React, { useId, useState } from "react";

interface Props {
  title: string;
  /** Кількість вибраних елементів — показується як « · N» після заголовка. */
  count?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Вміст ховається за кнопкою і за замовчуванням згорнутий. */
  collapsible?: boolean;
  /** Підпис кнопки розкриття (у згорнутому стані). */
  expandLabel?: string;
}

const ReportSection: React.FC<Props> = ({
  title,
  count,
  actions,
  children,
  collapsible = false,
  expandLabel = "Показати ще",
}) => {
  const [isOpen, setIsOpen] = useState(!collapsible);
  const contentId = useId();
  const isContentVisible = !collapsible || isOpen;

  return (
    <div className="card">
      <div
        className={`flex items-center gap-2 ${isContentVisible ? "mb-3" : ""}`}
      >
        <h2 className="section-label mb-0!">
          {title}
          {typeof count === "number" && count > 0 && (
            <span className="font-normal text-ink-soft"> · {count}</span>
          )}
        </h2>
        {actions}
        {collapsible && (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-controls={contentId}
            className="btn btn-ghost btn-sm ml-auto"
          >
            {isOpen ? "Згорнути" : expandLabel}
          </button>
        )}
      </div>
      {collapsible ? (
        isOpen && (
          <div id={contentId} className="anim-rise">
            {children}
          </div>
        )
      ) : (
        children
      )}
    </div>
  );
};

export default ReportSection;
