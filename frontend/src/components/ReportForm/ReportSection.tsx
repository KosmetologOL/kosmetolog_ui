import React from "react";

interface Props {
  title: string;
  /** Кількість вибраних елементів — показується як « · N» після заголовка. */
  count?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const ReportSection: React.FC<Props> = ({ title, count, actions, children }) => (
  <div className="card">
    <div className="mb-3 flex items-center gap-2">
      <p className="section-label mb-0!">
        {title}
        {typeof count === "number" && count > 0 && (
          <span className="font-normal text-ink-soft"> · {count}</span>
        )}
      </p>
      {actions}
    </div>
    {children}
  </div>
);

export default ReportSection;
