import React from "react";

interface Props {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const ReportSection: React.FC<Props> = ({ title, actions, children }) => (
  <div className="card">
    <div className="flex items-center mb-3 gap-2">
      <p className="section-label mb-0!">{title}</p>
      {actions}
    </div>
    {children}
  </div>
);

export default ReportSection;
