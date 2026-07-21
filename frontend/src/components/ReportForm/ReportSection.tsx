import React from "react";

interface Props {
  title: string;
  children: React.ReactNode;
}

const ReportSection: React.FC<Props> = ({ title, children }) => (
  <div className="card">
    <p className="section-label">{title}</p>
    {children}
  </div>
);

export default ReportSection;
