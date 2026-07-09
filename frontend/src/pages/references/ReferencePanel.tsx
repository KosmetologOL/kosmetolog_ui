import { getCategories as fetchCategories } from "#api/referenceApi";
import CategoriesManager from "#components/Admin/CategoriesManager";
import CategoryItemsManager from "#components/Admin/CategoryItemsManager";
import DoctorsManager from "#components/Admin/DoctorsManager";
import RegistrationRequestsManager from "#components/Admin/RegistrationRequestsManager";
import ExamsManager from "#components/Exams/ExamsManager";
import HomeCaresManager from "#components/HomeCare/HomeCaresManager";
import MedicationsManager from "#components/Medications/MedicationsManager";
import PatientManager from "#components/PatientList/PatientManager";
import ProceduresManager from "#components/Procedures/ProceduresManager";
import SpecialistsManager from "#components/Specialists/SpecialistsManager";
import { useAuth } from "#hooks/useAuth";
import React, { useEffect, useState } from "react";

interface TabItem {
  key: string;
  label: string;
  isDynamic?: boolean;
}

const ReferencePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("categories");
  const [categories, setCategories] = useState<any[]>([]);
  const { isAdmin, isDoctor, user, logout } = useAuth();
  const readOnly = isDoctor && !isAdmin;

  const loadCategories = async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  useEffect(() => {
    void loadCategories();
    const handler = () => void loadCategories();
    window.addEventListener("categoriesUpdated", handler as EventListener);
    return () =>
      window.removeEventListener("categoriesUpdated", handler as EventListener);
  }, []);

  const referenceTabs: TabItem[] = [
    { key: "medications", label: "Засоби" },
    { key: "procedures", label: "Процедури" },
    { key: "exams", label: "Обстеження" },
    { key: "specialists", label: "Суміжні спеціалісти" },
    { key: "homecares", label: "Домашній догляд" },
    { key: "patients", label: "Пацієнти" },
  ];

  useEffect(() => {
    if (
      !isAdmin &&
      (activeTab === "categories" ||
        activeTab === "doctors" ||
        activeTab === "registration-requests")
    ) {
      setActiveTab("medications");
    }
  }, [activeTab, isAdmin]);

  const adminTabs: TabItem[] = isAdmin
    ? [
        { key: "categories", label: "Категорії" },
        { key: "doctors", label: "Лікарі" },
        { key: "registration-requests", label: "Запити" },
      ]
    : [];

  const dynamicTabs: TabItem[] = categories.map((cat) => ({
    key: `cat-${cat._id}`,
    label: cat.name,
    isDynamic: true,
  }));

  const allTabs = [...referenceTabs, ...adminTabs, ...dynamicTabs];

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

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Акаунт: {`${user?.email ?? "-"} (${user?.role ?? "-"})`}
        </div>
        <div>
          <button
            onClick={() => void logout()}
            className="rounded border px-3 py-1 text-sm text-green-700 hover:bg-green-50"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap justify-start gap-2 overflow-x-auto">
        {allTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium transition-all sm:px-4 sm:text-base ${
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
          <MedicationsManager readOnly={readOnly} />
        )}
        {activeTab === "procedures" && (
          <ProceduresManager readOnly={readOnly} />
        )}
        {activeTab === "exams" && <ExamsManager readOnly={readOnly} />}
        {activeTab === "specialists" && (
          <SpecialistsManager readOnly={readOnly} />
        )}
        {activeTab === "homecares" && <HomeCaresManager readOnly={readOnly} />}
        {activeTab === "patients" && <PatientManager canDelete={isAdmin} />}

        {activeTab === "categories" && <CategoriesManager />}
        {activeTab === "doctors" && <DoctorsManager />}
        {activeTab === "registration-requests" && (
          <RegistrationRequestsManager />
        )}

        {activeTab.startsWith("cat-") && (
          <CategoryItemsManager
            categoryId={activeTab.replace("cat-", "")}
            categoryName={
              categories.find((c) => `cat-${c._id}` === activeTab)?.name ||
              "Категорія"
            }
          />
        )}
      </div>
    </div>
  );
};

export default ReferencePanel;
