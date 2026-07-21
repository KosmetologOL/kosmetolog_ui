import type { IPatient } from "#api/patientsApi";
import React from "react";

interface Props {
  reportId: string | null;
  patient: IPatient;
  onExport: () => void;
}

const ReportActions: React.FC<Props> = ({ reportId, onExport }) => (
  <div className="flex flex-wrap gap-3">
    <button type="submit" className="btn btn-primary">
      {reportId ? "Оновити звіт" : "Створити звіт"}
    </button>
    <button type="button" onClick={onExport} className="btn btn-ghost">
      Експортувати PDF
    </button>
  </div>
);

export default ReportActions;
