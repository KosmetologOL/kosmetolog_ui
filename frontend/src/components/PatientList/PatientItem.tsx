import type { IPatient } from "#api/patientsApi";
import { getReportByPatientId } from "#api/reportsApi";
import { generateReportPDF } from "#components/ReportForm/pdf/generateReportPDF";
import { useAuth } from "#hooks/useAuth";
import { getReportCreatorName } from "#types/getReportCreatorName";
import { normalizeProcedureStages } from "#types/normalizeProcedureStages";
import React from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  patient: IPatient;
  onEdit: (patient: IPatient) => void;
}

const PatientItem: React.FC<Props> = ({ patient, onEdit }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createdDate = patient.createdAt
    ? new Date(patient.createdAt).toLocaleDateString("uk-UA")
    : "";

  const handleExportPDF = async () => {
    try {
      const report = await getReportByPatientId(patient._id!);
      const procedureStages = normalizeProcedureStages(report);
      await generateReportPDF({
        patient,
        exams: report.exams || [],
        medications: report.medications || [],
        procedures: report.procedures || [],
        procedureStages: procedureStages,
        specialists: report.specialists || [],
        homeCares: report.homeCares || [],
        additionalInfo: report.additionalInfo || "",
        comments: report.comments || "",
        finalNote: report.finalNote || "",
        doctorName: getReportCreatorName(report.editHistory) || user?.name || "",
      });
    } catch {
      alert("Не вдалося створити PDF — можливо, звіт ще не створено.");
    }
  };

  return (
    <li className="border p-3 rounded-md shadow-sm flex flex-col gap-2">
      <div>
        <div className="font-semibold text-lg">{patient.fullName}</div>
        {createdDate && (
          <div className="text-sm text-gray-500">
            Дата створення: {createdDate}
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-2 justify-end">
        <button
          onClick={() => onEdit(patient)}
          className="px-3 py-1 border border-amber-300 text-amber-700 rounded hover:bg-amber-100"
        >
          Редагувати
        </button>

        <button
          onClick={() => navigate(`/create-report/${patient._id}`)}
          className="px-3 py-1 border border-green-300 text-green-700 rounded hover:bg-green-100"
        >
          Карта пацієнта
        </button>

        <button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition ml-auto"
        >
          Експортувати PDF
        </button>
      </div>
    </li>
  );
};

export default PatientItem;
