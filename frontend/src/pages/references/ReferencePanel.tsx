import {
  getCategories as fetchCategories,
  getRegistrationRequests,
  type ICategory,
} from "#api/referenceApi";
import CategoriesManager from "#components/Admin/CategoriesManager";
import CategoryItemsManager from "#components/Admin/CategoryItemsManager";
import DoctorsManager from "#components/Admin/DoctorsManager";
import RegistrationRequestsManager from "#components/Admin/RegistrationRequestsManager";
import SettingsManager from "#components/Admin/SettingsManager";
import ExamsManager from "#components/Exams/ExamsManager";
import HomeCaresManager from "#components/HomeCare/HomeCaresManager";
import MedicationsManager from "#components/Medications/MedicationsManager";
import PatientManager from "#components/PatientList/PatientManager";
import ProceduresManager from "#components/Procedures/ProceduresManager";
import SpecialistsManager from "#components/Specialists/SpecialistsManager";
import { useAuth } from "#hooks/useAuth";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
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
  const setActiveTab = useCallback(
    (tab: string) => {
      setActiveTabState(tab);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", tab);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [requestsCount, setRequestsCount] = useState<number>(0);
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const { isAdmin, isDoctor } = useAuth();
  const readOnly = isDoctor && !isAdmin;

  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats || []);
    } catch {
      toast.error("Не вдалося завантажити категорії довідників.");
    }
  }, []);

  useEffect(() => {
    void loadCategories();
    const handler = () => void loadCategories();
    window.addEventListener("categoriesUpdated", handler as EventListener);
    return () =>
      window.removeEventListener("categoriesUpdated", handler as EventListener);
  }, [loadCategories]);

  // Бейдж кількості запитів на реєстрацію (таб «Запити»): один фетч на монтування
  // + оновлення через подію від RegistrationRequestsManager після кожного load.
  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    getRegistrationRequests()
      .then((requests) => {
        if (!cancelled) setRequestsCount(requests?.length ?? 0);
      })
      .catch(() => {
        // Бейдж — необовʼязкова прикраса; помилку побачить сам таб «Запити»
      });

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === "number") setRequestsCount(detail);
    };
    window.addEventListener("registrationRequestsUpdated", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("registrationRequestsUpdated", handler);
    };
  }, [isAdmin]);

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
  }, [activeTab, isAdmin, setActiveTab]);

  // Автопрокрутка рядка табів до активного таба (без block-скролу сторінки)
  useEffect(() => {
    const activeButton = tabListRef.current?.querySelector<HTMLElement>(
      '[aria-selected="true"]',
    );
    activeButton?.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeTab]);

  const dynamicTabs: TabItem[] = categories.map((cat) => ({
    key: `cat-${cat._id}`,
    label: cat.name,
    isDynamic: true,
  }));

  // Адмін-група в кінці рядка табів; «Важливі тексти» доступні й лікарям
  const trailingTabs: TabItem[] = [
    ...(isAdmin
      ? [
          { key: "categories", label: "Категорії" },
          { key: "doctors", label: "Лікарі" },
          { key: "registration-requests", label: "Запити" },
        ]
      : []),
    { key: "settings", label: "Важливі тексти" },
  ];

  const renderTab = (tab: TabItem) => (
    <button
      key={tab.key}
      role="tab"
      aria-selected={activeTab === tab.key}
      onClick={() => setActiveTab(tab.key)}
      className={`tab-pill whitespace-nowrap ${activeTab === tab.key ? "is-active" : ""}`}
    >
      {tab.label}
      {tab.key === "registration-requests" && requestsCount > 0 && (
        <span className="pill is-on ml-1.5">{requestsCount}</span>
      )}
    </button>
  );

  return (
    <div>
      <h1 className="mb-5 text-[23px] tracking-[0.22em] uppercase">
        Довідники
      </h1>

      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Довідники"
        className="mb-5 flex w-full items-center overflow-x-auto pb-1 gap-1.5 scrollbar-none sm:flex-wrap"
      >
        {referenceTabs.map(renderTab)}
        {dynamicTabs.map(renderTab)}
        <span
          className="h-4 w-px shrink-0 self-center bg-line"
          aria-hidden="true"
        />
        {trailingTabs.map(renderTab)}
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
        {activeTab === "settings" && <SettingsManager readOnly={readOnly} />}

        {activeTab === "categories" && <CategoriesManager />}
        {activeTab === "doctors" && <DoctorsManager />}
        {activeTab === "registration-requests" && (
          <RegistrationRequestsManager />
        )}

        {activeTab.startsWith("cat-") && (
          <CategoryItemsManager
            key={activeTab}
            categoryId={activeTab.replace("cat-", "")}
            categoryName={
              categories.find((c) => `cat-${c._id}` === activeTab)?.name ||
              "Категорія"
            }
            showNameInReport={
              categories.find((c) => `cat-${c._id}` === activeTab)
                ?.showNameInReport
            }
            reportPosition={
              categories.find((c) => `cat-${c._id}` === activeTab)
                ?.reportPosition
            }
            importantNote={
              categories.find((c) => `cat-${c._id}` === activeTab)
                ?.importantNote
            }
          />
        )}
      </div>
    </div>
  );
};

export default ReferencePanel;
