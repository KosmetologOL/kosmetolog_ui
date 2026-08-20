import { getPatientById, updatePatient, type IPatient } from "#api/patientsApi";
import {
  createReport,
  getReportByPatientId,
  type IReport,
  type IReportEditHistoryItem,
  updateReport,
} from "#api/reportsApi";
import { getSettings } from "#api/settingsApi";
import { useAuth } from "#hooks/useAuth";
import axios from "axios";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "react-router-dom";

import SearchCategories, {
  type IReportCategoryItem,
} from "#components/Categories/SearchCategories";
import SearchExam from "#components/Exams/SearchExam";
import SelectedExamsTable from "#components/Exams/SelectedExamsTable";
import SearchHomeCare from "#components/HomeCare/SearchHomeCare";
import SearchSpecialist from "#components/Specialists/SearchSpecialist";
import SelectedSpecialistsTable from "#components/Specialists/SelectedSpecialistsTable";

import type { IExam } from "#api/examsApi";
import type { IHomeCare } from "#api/homeCaresApi";
import type { IMedication } from "#api/medicationsApi";
import type { ISpecialist } from "#api/specialistsApi";
import { getReportCreatorName } from "#lib/getReportCreatorName";

import SearchMedication from "#components/Medications/SearchMedication";
import SelectedMedicationsTable from "#components/Medications/SelectedMedicationsTable";
import PatientFormModal from "#components/PatientList/PatientFormModal";
import ReferenceItemModal from "#components/ReferenceItemModal";
import { appendReportToDocx } from "#components/ReportForm/docx/appendReportToDocx";
import { generateReportHtml } from "#components/ReportForm/html/generateReportHtml";
import NoteField from "#components/ReportForm/NoteField";
import ProcedureStageCard, {
  type IProcedureStage,
  type StageProcedure,
} from "#components/ReportForm/ProcedureStageCard";
import ReportActions from "#components/ReportForm/ReportActions";
import ReportComments from "#components/ReportForm/ReportComments";
import ReportSection from "#components/ReportForm/ReportSection";
import {
  INTERVAL_OPTIONS,
  ZONE_OPTIONS,
} from "#components/ReportForm/procedureStageOptions";
import { plural } from "#lib/plural";
import { isDocxLinkingSupported } from "#lib/docxCardLink";
import { ensureReportsDirectoryHandle } from "#lib/pdfSaveLocation";
import { isAbortError } from "#lib/abortError";
import toast from "react-hot-toast";

/** Процедура, як вона приходить зі збереженого листа: `_id` може бути відсутнім. */
type RawStageProcedure = Omit<StageProcedure, "_id"> & { _id?: string };

/**
 * Нормалізація процедур етапу: кожній гарантуємо `_id`
 * (збережений або новий uuid) — це єдиний ключ для key/оновлень/видалення.
 */
const withOtherFlags = (procedures: RawStageProcedure[]): StageProcedure[] =>
  procedures.map((p) => ({
    ...p,
    _id: p._id ?? crypto.randomUUID(),
    zoneOther: !!p.zone && !ZONE_OPTIONS.includes(p.zone),
    intervalOther: !!p.interval && !INTERVAL_OPTIONS.includes(p.interval),
    visitCountEnabled: p.visitCountEnabled ?? true,
  }));

interface EditingProcedureState {
  stageId: string;
  procedureId: string;
  name: string;
  recommendation?: string;
  comment?: string;
}

const DEFAULT_FINAL_NOTE = `Якщо Вас щось турбує, обовʼязково повідомте за номером телефону
📞 +38 (073) 838-23-23 або напишіть нам в Instagram, Telegram. При термінових станах телефонуйте за номером чи у позаробочий час у Instagram (декілька разів, якщо без відповіді).`;

const NOTE_PLACEHOLDER =
  "Застереження чи уточнення до цього розділу (необовʼязково)";

const CreateReportForm: React.FC = () => {
  const { patientId } = useParams();
  const [patient, setPatient] = useState<IPatient | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const [selectedExams, setSelectedExams] = useState<IExam[]>([]);
  const [selectedMedications, setSelectedMedications] = useState<IMedication[]>(
    [],
  );
  const [selectedSpecialists, setSelectedSpecialists] = useState<ISpecialist[]>(
    [],
  );
  const [selectedHomeCares, setSelectedHomeCares] = useState<IHomeCare[]>([]);
  const [selectedCategoryItems, setSelectedCategoryItems] = useState<
    IReportCategoryItem[]
  >([]);
  const [procedureStages, setProcedureStages] = useState<IProcedureStage[]>([]);
  const [editingProcedure, setEditingProcedure] =
    useState<EditingProcedureState | null>(null);
  const [editingPatientName, setEditingPatientName] = useState(false);
  const [reportHistory, setReportHistory] = useState<IReportEditHistoryItem[]>(
    [],
  );

  const { user } = useAuth();
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isAppendingToDocx, setIsAppendingToDocx] = useState(false);
  const isDocxSupported = isDocxLinkingSupported();
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [finalNote, setFinalNote] = useState(DEFAULT_FINAL_NOTE);
  const [medicationsNote, setMedicationsNote] = useState("");
  const [homeCareNote, setHomeCareNote] = useState("");
  const [examsNote, setExamsNote] = useState("");
  const [proceduresNote, setProceduresNote] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const createdDate = patient?.createdAt
    ? new Date(patient.createdAt).toLocaleDateString("uk-UA")
    : "";

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        selectedExams,
        selectedMedications,
        selectedSpecialists,
        selectedHomeCares,
        selectedCategoryItems,
        procedureStages,
        comments,
        additionalInfo,
        finalNote,
        medicationsNote,
        homeCareNote,
        examsNote,
        proceduresNote,
      }),
    [
      selectedExams,
      selectedMedications,
      selectedSpecialists,
      selectedHomeCares,
      selectedCategoryItems,
      procedureStages,
      comments,
      additionalInfo,
      finalNote,
      medicationsNote,
      homeCareNote,
      examsNote,
      proceduresNote,
    ],
  );

  const isDirty = savedSnapshot !== null && currentSnapshot !== savedSnapshot;

  useEffect(() => {
    const fetchData = async () => {
      if (!patientId) return;
      setLoading(true);
      setLoadError(false);
      try {
        const [patientData, reportData, settingsData] = await Promise.all([
          getPatientById(patientId),
          // 404 = листа ще немає (новий пацієнт). Будь-який інший збій —
          // це саме збій, і його не можна плутати з «листа немає»:
          // інакше форма відкриється порожня і «Зберегти» створить дубль.
          getReportByPatientId(patientId).catch((err): IReport | null => {
            if (axios.isAxiosError(err) && err.response?.status === 404) {
              return null;
            }
            throw err;
          }),
          getSettings(),
        ]);
        setPatient(patientData);

        setMedicationsNote(
          reportData?.medicationsNote ?? settingsData.medicationsNote ?? "",
        );
        setHomeCareNote(
          reportData?.homeCareNote ?? settingsData.homeCareNote ?? "",
        );
        setExamsNote(reportData?.examsNote ?? settingsData.examsNote ?? "");
        setProceduresNote(
          reportData?.proceduresNote ?? settingsData.proceduresNote ?? "",
        );

        if (reportData) {
          setReportId(reportData._id ?? null);
          setSelectedExams(reportData.exams ?? []);
          setSelectedMedications(reportData.medications ?? []);
          setSelectedSpecialists(reportData.specialists ?? []);
          setSelectedHomeCares(reportData.homeCares ?? []);
          setSelectedCategoryItems(
            (reportData.categories ?? []).map((c) => ({
              _id: c._id ?? crypto.randomUUID(),
              categoryId: c.categoryId,
              categoryName: c.categoryName,
              itemName: c.itemName,
              recommendation: c.recommendation,
            })),
          );
          setAdditionalInfo(reportData.additionalInfo ?? "");
          setFinalNote(reportData.finalNote?.trim() || DEFAULT_FINAL_NOTE);
          setComments(reportData.comments ?? "");
          setReportHistory(reportData.editHistory ?? []);

          interface ReportProcedure {
            _id?: string;
            name: string;
            recommendation?: string;
            comment?: string;
            stage?: string;
            zoneEnabled?: boolean;
            zone?: string;
            intervalEnabled?: boolean;
            interval?: string;
            visitCountEnabled?: boolean;
            visitCount?: number;
          }

          interface ReportProcedureStage {
            stage: string;
            workWithEnabled?: boolean;
            workWith?: string;
            procedures: ReportProcedure[];
          }
          if (
            Array.isArray(reportData.procedureStages) &&
            reportData.procedureStages.length > 0
          ) {
            const stages = (
              reportData.procedureStages as ReportProcedureStage[]
            ).map((s) => ({
              id: crypto.randomUUID(),
              title: s.stage,
              workWithEnabled: s.workWithEnabled ?? false,
              workWith: s.workWith ?? "",
              procedures: withOtherFlags(
                (s.procedures ?? []) as RawStageProcedure[],
              ),
            }));
            setProcedureStages(stages);
          } else if (
            Array.isArray(reportData.procedures) &&
            reportData.procedures.length > 0
          ) {
            const grouped = (reportData.procedures as ReportProcedure[]).reduce(
              (acc, proc) => {
                const stageName = proc.stage || "Етап 1";
                if (!acc[stageName]) acc[stageName] = [];
                acc[stageName].push(proc);
                return acc;
              },
              {} as Record<string, ReportProcedure[]>,
            );

            const stages = Object.entries(grouped).map(
              ([stageName, procs]) => ({
                id: crypto.randomUUID(),
                title: stageName,
                workWithEnabled: false,
                workWith: "",
                procedures: withOtherFlags(procs as RawStageProcedure[]),
              }),
            );

            setProcedureStages(stages);
          } else {
            setProcedureStages([]);
          }
        }
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [patientId, reloadKey]);

  // Знімок «чистого» стану — одразу після завантаження даних.
  // При збої завантаження знімок не робимо: інакше порожня форма
  // зафіксувалася б як «збережений» стан.
  useEffect(() => {
    if (!loading && !loadError && savedSnapshot === null) {
      setSavedSnapshot(currentSnapshot);
    }
  }, [loading, loadError, savedSnapshot, currentSnapshot]);

  // Попередження браузера при закритті вкладки з незбереженими змінами.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleClose = useCallback(() => {
    if (
      isDirty &&
      !window.confirm("Є незбережені зміни. Закрити без збереження?")
    ) {
      return;
    }
    window.history.back();
  }, [isDirty]);

  const addStage = () => {
    setProcedureStages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: `Етап ${prev.length + 1}`,
        workWithEnabled: true,
        workWith: "",
        procedures: [],
      },
    ]);
  };

  const updateStage = useCallback(
    (id: string, updated: IProcedureStage) => {
      setProcedureStages((prev) =>
        prev.map((s) => (s.id === id ? updated : s)),
      );
    },
    [],
  );

  const removeStage = useCallback((stage: IProcedureStage) => {
    const count = stage.procedures.length;
    const message =
      count > 0
        ? `Видалити етап «${stage.title}» разом з ${count} ${plural(count, [
            "процедурою",
            "процедурами",
            "процедурами",
          ])}?`
        : `Видалити етап «${stage.title}»?`;
    if (!window.confirm(message)) return;
    setProcedureStages((prev) => prev.filter((s) => s.id !== stage.id));
  }, []);

  const openProcedureEditor = useCallback(
    (stageId: string, procedure: StageProcedure) => {
      setEditingProcedure({
        stageId,
        procedureId: procedure._id,
        name: procedure.name,
        recommendation: procedure.recommendation ?? "",
        comment: procedure.comment ?? "",
      });
    },
    [],
  );

  const saveProcedureEditor = (updatedProcedure: {
    name: string;
    recommendation?: string;
    comment?: string;
  }) => {
    if (!editingProcedure) {
      return;
    }

    setProcedureStages((prev) =>
      prev.map((stage) =>
        stage.id !== editingProcedure.stageId
          ? stage
          : {
              ...stage,
              procedures: stage.procedures.map((procedure) =>
                procedure._id === editingProcedure.procedureId
                  ? {
                      ...procedure,
                      name: updatedProcedure.name,
                      recommendation: updatedProcedure.recommendation ?? "",
                      comment: updatedProcedure.comment ?? "",
                    }
                  : procedure,
              ),
            },
      ),
    );
    setEditingProcedure(null);
  };

  const handleUpdatePatientName = async (updated: IPatient) => {
    if (!patient?._id) return;

    try {
      const savedPatient = await updatePatient(patient._id, updated);
      setPatient(savedPatient);
      setEditingPatientName(false);
      toast.success("Імʼя пацієнта оновлено.");
    } catch {
      toast.error("Не вдалося оновити імʼя пацієнта. Спробуйте ще раз.");
    }
  };

  const saveReport = async (): Promise<IReport | null> => {
    if (!patientId) {
      toast.error("Пацієнта не вибрано.");
      return null;
    }

    const payload = {
      patient: patientId,
      exams: selectedExams.map((e) => ({
        name: e.name,
        recommendation: e.recommendation,
      })),
      medications: selectedMedications.map((m) => ({
        name: m.name,
        recommendation: m.recommendation,
      })),
      specialists: selectedSpecialists.map((s) => ({
        name: s.name,
        query: s.query,
      })),
      homeCares: selectedHomeCares.map((h) => ({
        name: h.name,
        morning: h.morning,
        evening: h.evening,
        medicationName: h.medicationName || "Засіб",
        recommendations: h.recommendations || "",
      })),
      categories: selectedCategoryItems.map((c) => ({
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        itemName: c.itemName,
        recommendation: c.recommendation || "",
      })),
      procedureStages: procedureStages.map((s) => ({
        stage: s.title,
        workWithEnabled: s.workWithEnabled ?? false,
        workWith: s.workWith ?? "",
        procedures: s.procedures.map((p) => ({
          _id: p._id,
          name: p.name,
          comment: p.comment,
          recommendation: p.recommendation,
          zoneEnabled: p.zoneEnabled ?? false,
          zone: p.zone ?? "",
          intervalEnabled: p.intervalEnabled ?? false,
          interval: p.interval ?? "",
          visitCountEnabled: p.visitCountEnabled ?? false,
          visitCount: p.visitCount,
        })),
      })),
      procedures: procedureStages.flatMap((s) =>
        s.procedures.map((p) => ({
          name: p.name,
          comment: p.comment,
          recommendation: p.recommendation,
          stage: s.title,
        })),
      ),
      comments,
      additionalInfo,
      finalNote,
      medicationsNote,
      homeCareNote,
      examsNote,
      proceduresNote,
    };

    setIsSubmitting(true);
    try {
      let savedReport: IReport;
      if (reportId) {
        savedReport = await updateReport(reportId, payload);
      } else {
        savedReport = await createReport(payload);
        setReportId(savedReport?._id ?? null);
      }
      toast.success("Лист збережено.");
      setReportHistory(savedReport.editHistory ?? []);
      setSavedSnapshot(currentSnapshot);
      return savedReport;
    } catch {
      toast.error("Не вдалося зберегти лист. Спробуйте ще раз.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveReport();
  };

  const handleExportHtml = async () => {
    if (!patient) return;

    setIsExportingHtml(true);
    try {
      const directoryHandle = await ensureReportsDirectoryHandle();

      const savedReport = await saveReport();
      if (!savedReport) return;

      await generateReportHtml({
        patient,
        exams: selectedExams,
        medications: selectedMedications,
        procedures: procedureStages.flatMap((s) => s.procedures),
        procedureStages,
        specialists: selectedSpecialists,
        homeCares: selectedHomeCares,
        categoryItems: selectedCategoryItems,
        comments,
        additionalInfo,
        finalNote,
        medicationsNote,
        homeCareNote,
        examsNote,
        proceduresNote,
        doctorName:
          getReportCreatorName(savedReport.editHistory ?? []) ||
          user?.name ||
          "",
        directoryHandle,
      });
    } catch (error) {
      if (isAbortError(error)) {
        toast("Скасовано — нічого не збережено.", { icon: "ℹ️" });
      } else {
        toast.error("Не вдалося експортувати HTML. Спробуйте ще раз.");
      }
    } finally {
      setIsExportingHtml(false);
    }
  };

  const handleExportPdf = async () => {
    if (!patient) return;

    setIsExportingPdf(true);
    try {
      const directoryHandle = await ensureReportsDirectoryHandle();

      const savedReport = await saveReport();
      if (!savedReport) return;

      // Динамічний імпорт навмисно: @react-pdf/renderer важить близько
      // 800 КБ і при статичному імпорті потрапляв у чанк сторінки звіту,
      // подвоюючи його. Тепер вантажиться тільки за натисканням кнопки.
      const { generateReportPdf } = await import(
        "#components/ReportForm/pdf/generateReportPdf"
      );

      await generateReportPdf({
        patient,
        exams: selectedExams,
        medications: selectedMedications,
        procedures: procedureStages.flatMap((s) => s.procedures),
        procedureStages,
        specialists: selectedSpecialists,
        homeCares: selectedHomeCares,
        categoryItems: selectedCategoryItems,
        comments,
        additionalInfo,
        finalNote,
        medicationsNote,
        homeCareNote,
        examsNote,
        proceduresNote,
        doctorName:
          getReportCreatorName(savedReport.editHistory ?? []) ||
          user?.name ||
          "",
        directoryHandle,
      });
    } catch (error) {
      if (isAbortError(error)) {
        toast("Скасовано — нічого не збережено.", { icon: "ℹ️" });
      } else {
        toast.error("Не вдалося експортувати PDF. Спробуйте ще раз.");
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleAppendToDocx = async () => {
    if (!patient?._id) return;

    setIsAppendingToDocx(true);
    try {
      const savedReport = await saveReport();
      if (!savedReport) return;

      await appendReportToDocx({
        patient,
        exams: selectedExams,
        medications: selectedMedications,
        procedures: procedureStages.flatMap((s) => s.procedures),
        procedureStages,
        specialists: selectedSpecialists,
        homeCares: selectedHomeCares,
        categoryItems: selectedCategoryItems,
        comments,
        additionalInfo,
        finalNote,
        medicationsNote,
        homeCareNote,
        examsNote,
        proceduresNote,
        doctorName:
          getReportCreatorName(savedReport.editHistory ?? []) ||
          user?.name ||
          "",
      });
    } catch (error) {
      if (!isAbortError(error)) {
        toast.error(
          "Не вдалося додати лист у картку (.docx). Спробуйте ще раз.",
        );
      }
    } finally {
      setIsAppendingToDocx(false);
    }
  };

  const proceduresCount = procedureStages.reduce(
    (sum, s) => sum + s.procedures.length,
    0,
  );

  if (loading)
    return (
      <div aria-busy="true">
        <span className="sr-only">Завантаження…</span>
        <div className="skeleton mb-4 h-9 w-28" />
        <div className="skeleton mb-2 h-7 w-2/3" />
        <div className="skeleton mb-6 h-4 w-44" />
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card">
              <div className="skeleton mb-4 h-4 w-48" />
              <div className="skeleton mb-3 h-12 w-full" />
              <div className="skeleton h-[60px] w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  if (loadError)
    return (
      <div className="py-12 text-center">
        <p className="mb-1 text-ink">Не вдалося завантажити лист.</p>
        <p className="mb-5 text-ink-soft">
          Перевірте зʼєднання та спробуйте ще раз. Форма не відкриється, доки
          дані не завантажаться, — інакше збереження створило б дубль листа.
        </p>
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="btn btn-primary"
        >
          Спробувати ще раз
        </button>
      </div>
    );
  if (!patient)
    return (
      <p className="py-12 text-center text-ink-soft">Пацієнта не знайдено.</p>
    );

  return (
    <div>
      <button
        type="button"
        onClick={handleClose}
        className="btn btn-ghost btn-sm mb-4"
      >
        ← Назад
      </button>

      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="panel-title">
            Рекомендаційний лист — {patient?.fullName}
          </h1>
          <button
            type="button"
            onClick={() => setEditingPatientName(true)}
            className="btn btn-ghost btn-sm"
          >
            Редагувати
          </button>
        </div>
        <p className="mt-1 text-[14.5px] text-ink-soft">
          Дата створення: {createdDate || "невідомо"}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          {reportHistory.length > 0 && (
            <ReportSection
              title="Історія редагувань"
              count={reportHistory.length}
              collapsible
            >
              <ul className="flex flex-col gap-2 text-sm text-ink-soft">
                {reportHistory
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <li key={`${entry.editedAt}-${index}`}>
                      <span className="font-bold text-ink">
                        {entry.action === "create"
                          ? "Створення"
                          : "Оновлення"}
                      </span>{" "}
                      —{" "}
                      {[
                        (entry.name || "").trim(),
                        (entry.email || "").trim(),
                      ]
                        .filter(Boolean)
                        .join(" • ") || "невідомий користувач"}{" "}
                      ({entry.role || "роль не вказана"}) —{" "}
                      {new Date(entry.editedAt).toLocaleString("uk-UA")}
                    </li>
                  ))}
              </ul>
            </ReportSection>
          )}

          <ReportSection
            title="Рекомендована консультація суміжного спеціаліста"
            count={selectedSpecialists.length}
          >
            <SearchSpecialist
              selectedSpecialists={selectedSpecialists}
              setSelectedSpecialists={setSelectedSpecialists}
            />
            <SelectedSpecialistsTable
              selectedSpecialists={selectedSpecialists}
              setSelectedSpecialists={setSelectedSpecialists}
            />
          </ReportSection>

          <ReportSection title="Обстеження" count={selectedExams.length}>
            <SearchExam
              selectedExams={selectedExams}
              setSelectedExams={setSelectedExams}
            />
            <SelectedExamsTable
              selectedExams={selectedExams}
              setSelectedExams={setSelectedExams}
            />
            <NoteField
              className="mt-3"
              label="Важливо"
              value={examsNote}
              onChange={setExamsNote}
              placeholder={NOTE_PLACEHOLDER}
            />
          </ReportSection>

          <ReportSection title="Засоби" count={selectedMedications.length}>
            <SearchMedication
              selectedMedications={selectedMedications}
              setSelectedMedications={setSelectedMedications}
            />
            <SelectedMedicationsTable
              selectedMedications={selectedMedications}
              setSelectedMedications={setSelectedMedications}
            />
            <NoteField
              className="mt-3"
              label="Важливо"
              value={medicationsNote}
              onChange={setMedicationsNote}
              placeholder={NOTE_PLACEHOLDER}
            />
          </ReportSection>

          <ReportSection
            title="Домашній догляд"
            count={selectedHomeCares.length}
          >
            <SearchHomeCare
              selectedHomeCares={selectedHomeCares}
              setSelectedHomeCares={setSelectedHomeCares}
            />
            <NoteField
              className="mt-3"
              label="Важливо"
              value={homeCareNote}
              onChange={setHomeCareNote}
              placeholder={NOTE_PLACEHOLDER}
            />
          </ReportSection>

          <ReportSection
            title="Категорії"
            count={selectedCategoryItems.length}
          >
            <SearchCategories
              selectedCategoryItems={selectedCategoryItems}
              setSelectedCategoryItems={setSelectedCategoryItems}
            />
          </ReportSection>

          <ReportSection title="Процедури" count={proceduresCount}>
            {procedureStages.map((stage) => (
              <ProcedureStageCard
                key={stage.id}
                stage={stage}
                onUpdate={updateStage}
                onRemove={removeStage}
                onEditProcedure={openProcedureEditor}
              />
            ))}

            <button
              type="button"
              onClick={addStage}
              className="btn btn-ghost btn-sm mt-3"
            >
              + Додати етап
            </button>

            <NoteField
              className="mt-3"
              label="Важливо"
              value={proceduresNote}
              onChange={setProceduresNote}
              placeholder={NOTE_PLACEHOLDER}
            />
          </ReportSection>

          <ReportSection title="Все, що необхідно знати про ваш стан">
            <textarea
              aria-label="Все, що необхідно знати про ваш стан"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Необхідна інформація"
              rows={4}
              className="field-textarea min-h-[90px] w-full resize-y"
            />
          </ReportSection>

          <ReportComments comments={comments} setComments={setComments} />

          <ReportSection
            title="Текст у кінці рекомендаційного листа"
            actions={
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      finalNote !== DEFAULT_FINAL_NOTE &&
                      !window.confirm(
                        "Прибрати цей текст із листа? Відновити можна буде лише стандартний текст.",
                      )
                    ) {
                      return;
                    }
                    setFinalNote("");
                  }}
                  disabled={!finalNote}
                  className="btn-link text-sm text-ink-soft"
                >
                  Очистити
                </button>
                <button
                  type="button"
                  onClick={() => setFinalNote(DEFAULT_FINAL_NOTE)}
                  disabled={finalNote === DEFAULT_FINAL_NOTE}
                  className="btn-link text-sm"
                >
                  Повернути стандартний текст
                </button>
              </div>
            }
          >
            <textarea
              aria-label="Текст у кінці рекомендаційного листа"
              value={finalNote}
              onChange={(e) => setFinalNote(e.target.value)}
              placeholder="Текст, який буде додано в кінці листа"
              rows={4}
              className="field-textarea min-h-[90px] w-full resize-y"
            />
          </ReportSection>

          <ReportActions
            isSubmitting={isSubmitting}
            isExportingHtml={isExportingHtml}
            isExportingPdf={isExportingPdf}
            isAppendingToDocx={isAppendingToDocx}
            isDocxSupported={isDocxSupported}
            onExportHtml={handleExportHtml}
            onExportPdf={handleExportPdf}
            onAppendToDocx={handleAppendToDocx}
            onClose={handleClose}
          />

          <PatientFormModal
            visible={editingPatientName}
            title="Редагувати дані пацієнта"
            patient={patient}
            onClose={() => setEditingPatientName(false)}
            onSave={handleUpdatePatientName}
          />
        </div>
      </form>

      <ReferenceItemModal
        visible={Boolean(editingProcedure)}
        title="Редагувати рекомендацію до процедури"
        submitLabel="Зберегти"
        recommendationLabel="Рекомендація до процедури"
        commentLabel="Коментар до процедури"
        item={{
          name: editingProcedure?.name ?? "",
          recommendation: editingProcedure?.recommendation ?? "",
          comment: editingProcedure?.comment ?? "",
        }}
        onClose={() => setEditingProcedure(null)}
        onSave={saveProcedureEditor}
      />
    </div>
  );
};

export default CreateReportForm;
