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
import { useSearchParams } from "react-router-dom";

interface TabItem {
  key: string;
  label: string;
  isDynamic?: boolean;
}

const ReferencePanel: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState<string>(
    () => searchParams.get("tab") || "categories",
  );
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  };
  const [categories, setCategories] = useState<any[]>([]);
  const { isAdmin, isDoctor } = useAuth();
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
    <div>
      <h1 className="mb-5 text-[23px] tracking-[0.22em] uppercase">
        Довідники
      </h1>

      <div className="mb-5 flex w-full overflow-x-auto pb-1 gap-1.5 scrollbar-none sm:flex-wrap">
        {allTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab-pill whitespace-nowrap ${activeTab === tab.key ? "is-active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card">
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
