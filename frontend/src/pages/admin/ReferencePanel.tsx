import ExamsManager from "#components/Exams/ExamsManager";
import HomeCaresManager from "#components/HomeCare/HomeCaresManager";
import MedicationsManager from "#components/Medications/MedicationsManager";
import PatientManager from "#components/PatientList/PatientManager";
import ProceduresManager from "#components/Procedures/ProceduresManager";
import SpecialistsManager from "#components/Specialists/SpecialistsManager";
import { useAuth } from "#hooks/useAuth";
import React, { useState } from "react";

interface ReferencePanelProps {
  key:
    | "medications"
    | "procedures"
    | "exams"
    | "specialists"
    | "homecares"
    | "patients";
  label: string;
}

const ReferencePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    | "medications"
    | "procedures"
    | "exams"
    | "specialists"
    | "homecares"
    | "patients"
  >("medications");
  const { isAdmin, isDoctor } = useAuth();
  const readOnly = isDoctor && !isAdmin;
  const readOnlyReferenceTabs = readOnly;

  const tabs: ReferencePanelProps[] = [
    { key: "medications", label: "Засоби" },
    { key: "procedures", label: "Процедури" },
    { key: "exams", label: "Обстеження" },
    { key: "specialists", label: "Суміжні спеціалісти" },
    { key: "homecares", label: "Домашній догляд" },
    { key: "patients", label: "Пацієнти" },
  ];

  return (
    <div className="mx-auto flex min-h-[90vh] max-w-screen-xl flex-col justify-start px-4 py-6 sm:justify-center sm:px-6 lg:px-8">
      <button
        onClick={() => window.history.back()}
        className="mb-4 w-fit rounded border border-green-300 px-4 py-1.5 text-sm font-medium text-green-700 shadow-sm transition-all duration-200 hover:bg-green-50 active:scale-95"
      >
        ← Назад
      </button>

      <h1 className="mb-2 text-center text-xl font-bold text-green-700 sm:text-left sm:text-2xl lg:text-3xl">
        Панель довідників
      </h1>

      {readOnly && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Режим лікаря: довідники доступні лише для перегляду.
        </p>
      )}

      <div className="mb-6 flex flex-wrap justify-center gap-2 sm:justify-start sm:gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-all sm:px-4 sm:text-base ${
              activeTab === tab.key
                ? "border-green-700 bg-green-600 text-white shadow-md"
                : "border-green-300 bg-white text-green-700 hover:bg-green-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-grow overflow-auto rounded-lg border bg-white p-4 shadow-sm sm:p-6">
        {activeTab === "medications" && (
          <MedicationsManager readOnly={readOnlyReferenceTabs} />
        )}
        {activeTab === "procedures" && (
          <ProceduresManager readOnly={readOnlyReferenceTabs} />
        )}
        {activeTab === "exams" && (
          <ExamsManager readOnly={readOnlyReferenceTabs} />
        )}
        {activeTab === "specialists" && (
          <SpecialistsManager readOnly={readOnlyReferenceTabs} />
        )}
        {activeTab === "homecares" && (
          <HomeCaresManager readOnly={readOnlyReferenceTabs} />
        )}
        {activeTab === "patients" && <PatientManager canDelete={isAdmin} />}
      </div>
    </div>
  );
};

export default ReferencePanel;
