import React from "react";

interface Props {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const ReportSection: React.FC<Props> = ({ title, actions, children }) => (
  <div className="mb-4">
    <div className="mb-2 flex items-center gap-2">
      <h3 className="font-semibold">{title}</h3>
      {actions}
    </div>
    {children}
  </div>
);

export default ReportSection;
