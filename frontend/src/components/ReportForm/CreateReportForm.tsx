import { getPatientById, updatePatient, type IPatient } from "#api/patientsApi";
import {
  createReport,
  getReportByPatientId,
  type IReportEditHistoryItem,
  updateReport,
} from "#api/reportsApi";
import { useAuth } from "#hooks/useAuth";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import SearchExam from "#components/Exams/SearchExam";
import SelectedExamsTable from "#components/Exams/SelectedExamsTable";
import SearchHomeCare from "#components/HomeCare/SearchHomeCare";
import SearchSpecialist from "#components/Specialists/SearchSpecialist";
import SelectedSpecialistsTable from "#components/Specialists/SelectedSpecialistsTable";

import type { IExam } from "#api/examsApi";
import type { IHomeCare } from "#api/homeCaresApi";
import type { IMedication } from "#api/medicationsApi";
import type { IProcedure } from "#api/proceduresApi";
import type { ISpecialist } from "#api/specialistsApi";
import { getReportCreatorName } from "#types/getReportCreatorName";

import SearchMedication from "#components/Medications/SearchMedication";
import SelectedMedicationsTable from "#components/Medications/SelectedMedicatonsTable";
import SearchProcedure from "#components/Procedures/SearchProcedure";
import FormattedText from "#components/FormattedText";
import PatientFormModal from "#components/PatientList/PatientFormModal";
import ReferenceItemModal from "#components/ReferenceItemModal";
import { generateReportPDF } from "#components/ReportForm/pdf/generateReportPDF";
import ReportActions from "#components/ReportForm/ReportActions";
import ReportComments from "#components/ReportForm/ReportComments";
import ReportSection from "#components/ReportForm/ReportSection";
import toast from "react-hot-toast";

interface IProcedureStage {
  id: string;
  title: string;
  procedures: (IProcedure & { comment?: string })[];
}

interface EditingProcedureState {
  stageId: string;
  procedureId: string;
  name: string;
  recommendation?: string;
  comment?: string;
}

const DEFAULT_FINAL_NOTE = `Якщо Вас щось турбує, обов’язково повідомте за номером телефону
📞 +38 (073) 838-23-23 або напишіть нам в Instagram, Telegram. При термінових станах телефонуйте за номером чи у позаробочий час у Instagram (декілька разів, якщо без відповіді).`;
const DEFAULT_PROCEDURE_COMMENT = `Якщо Вас щось турбує, обов’язково повідомте за номером телефону
📞 +38 (073) 838-23-23 або напишіть нам в Instagram, Telegram. При термінових станах телефонуйте за номером чи у позаробочий час у Instagram (декілька разів, якщо без відповіді).`;

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [finalNote, setFinalNote] = useState(DEFAULT_FINAL_NOTE);
  const createdDate = patient?.createdAt
    ? new Date(patient.createdAt).toLocaleDateString("uk-UA")
    : "";

  useEffect(() => {
    const fetchData = async () => {
      if (!patientId) return;
      try {
        const [patientData, reportData] = await Promise.all([
          getPatientById(patientId),
          getReportByPatientId(patientId).catch(() => null),
        ]);
        setPatient(patientData);

        if (reportData) {
          setReportId(reportData._id ?? null);
          setSelectedExams(reportData.exams ?? []);
          setSelectedMedications(reportData.medications ?? []);
          setSelectedSpecialists(reportData.specialists ?? []);
          setSelectedHomeCares(reportData.homeCares ?? []);
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
          }

          interface ReportProcedureStage {
            stage: string;
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
              procedures: (s.procedures ?? []) as (IProcedure & {
                comment?: string;
              })[],
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
                procedures: procs as (IProcedure & { comment?: string })[],
              }),
            );

            setProcedureStages(stages);
          } else {
            setProcedureStages([]);
          }
        }
      } catch {
        toast.error("Не вдалося завантажити дані пацієнта або звіту.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [patientId]);

  const addStage = () => {
    setProcedureStages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: `Етап ${prev.length + 1}`,
        procedures: [],
      },
    ]);
  };

  const updateStage = (id: string, updated: IProcedureStage) => {
    setProcedureStages((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  const removeStage = (id: string) => {
    setProcedureStages((prev) => prev.filter((s) => s.id !== id));
  };

  const openProcedureEditor = (
    stageId: string,
    procedure: IProcedure & { comment?: string },
  ) => {
    setEditingProcedure({
      stageId,
      procedureId: procedure._id ?? procedure.name,
      name: procedure.name,
      recommendation: procedure.recommendation ?? "",
      comment: procedure.comment ?? "",
    });
  };

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
                (procedure._id ?? procedure.name) ===
                editingProcedure.procedureId
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
      toast.success("Ім'я пацієнта оновлено успішно!");
    } catch {
      toast.error("Не вдалося оновити ім'я пацієнта. Спробуйте ще раз.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return toast.error("Пацієнт не вибраний!");

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
      procedureStages: procedureStages.map((s) => ({
        stage: s.title,
        procedures: s.procedures.map((p) => ({
          name: p.name,
          comment: p.comment,
          recommendation: p.recommendation,
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
    };

    setIsSubmitting(true);
    try {
      let savedReport;
      if (reportId) {
        savedReport = await updateReport(reportId, payload);
        setReportHistory(savedReport.editHistory ?? []);
        toast.success("Звіт оновлено успішно!");
      } else {
        savedReport = await createReport(payload);
        toast.success("Звіт створено успішно!");
        setReportId(savedReport?._id ?? null);
        setReportHistory(savedReport.editHistory ?? []);
      }
    } catch {
      toast.error("Не вдалося зберегти звіт. Спробуйте ще раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return <p className="py-12 text-center text-ink-soft">Завантаження даних...</p>;
  if (!patient)
    return <p className="py-12 text-center text-ink-soft">Пацієнта не знайдено.</p>;

  return (
    <div>
      <button
        type="button"
        onClick={() => window.history.back()}
        className="btn btn-ghost btn-sm mb-4"
      >
        ← Назад
      </button>

      <div className="mb-5">
        <h1 className="flex flex-wrap items-center gap-2 text-[21px] tracking-[0.08em]">
          Рекомендаційний лист — {patient?.fullName}
          <button
            type="button"
            onClick={() => setEditingPatientName(true)}
            className="btn btn-ghost btn-sm"
          >
            Редагувати
          </button>
        </h1>
        <p className="mt-1 text-[14.5px] text-ink-soft">
          Дата створення: {createdDate || "невідомо"}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          {reportHistory.length > 0 && (
            <ReportSection title="Історія редагувань">
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
                      ({entry.role || "role не вказана"}) —{" "}
                      {new Date(entry.editedAt).toLocaleString("uk-UA")}
                    </li>
                  ))}
              </ul>
            </ReportSection>
          )}

          <ReportSection title="Рекомендована консультація суміжного спеціаліста">
            <SearchSpecialist
              selectedSpecialists={selectedSpecialists}
              setSelectedSpecialists={setSelectedSpecialists}
            />
            <SelectedSpecialistsTable
              selectedSpecialists={selectedSpecialists}
              setSelectedSpecialists={setSelectedSpecialists}
            />
          </ReportSection>

          <ReportSection title="Обстеження">
            <SearchExam
              selectedExams={selectedExams}
              setSelectedExams={setSelectedExams}
              exams={[]}
            />
            <SelectedExamsTable
              selectedExams={selectedExams}
              setSelectedExams={setSelectedExams}
            />
          </ReportSection>

          <ReportSection title="Засоби">
            <SearchMedication
              medication={[]}
              selectedMedications={selectedMedications}
              setSelectedMedications={setSelectedMedications}
            />
            <SelectedMedicationsTable
              selectedMedications={selectedMedications}
              setSelectedMedications={setSelectedMedications}
            />
          </ReportSection>

          <ReportSection title="Домашній догляд">
            <SearchHomeCare
              selectedHomeCares={selectedHomeCares}
              setSelectedHomeCares={setSelectedHomeCares}
            />
          </ReportSection>

          <ReportSection title="Процедури">
            {procedureStages.map((stage) => (
              <div key={stage.id} className="stage-card">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <input
                    type="text"
                    value={stage.title}
                    onChange={(e) =>
                      updateStage(stage.id, {
                        ...stage,
                        title: e.target.value,
                      })
                    }
                    className="field-input h-10 max-w-[260px]"
                  />
                  <button
                    type="button"
                    onClick={() => removeStage(stage.id)}
                    className="btn btn-ghost btn-sm text-danger"
                  >
                    Видалити етап
                  </button>
                </div>

                <SearchProcedure
                  selectedProcedures={stage.procedures as IProcedure[]}
                  setSelectedProcedures={(updated) => {
                    const newProcedures =
                      typeof updated === "function"
                        ? updated(stage.procedures as IProcedure[])
                        : updated;

                    updateStage(stage.id, {
                      ...stage,
                      procedures: newProcedures.map((p) => ({
                        ...p,
                        comment:
                          stage.procedures.find((sp) => sp._id === p._id)
                            ?.comment || DEFAULT_PROCEDURE_COMMENT,
                      })),
                    });
                  }}
                />

                {stage.procedures.map((proc) => (
                  <div key={proc._id} className="proc-card">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-bold">{proc.name}</p>
                        <FormattedText
                          markdown={proc.recommendation}
                          fallback="Рекомендація відсутня"
                          className="mt-1 text-[13.5px] leading-5 text-ink-soft"
                        />
                        {proc.comment &&
                          proc.comment !== DEFAULT_PROCEDURE_COMMENT && (
                            <div className="mt-2 whitespace-pre-wrap rounded-lg bg-brand-soft px-2.5 py-2 text-[13.5px] leading-5">
                              {proc.comment}
                            </div>
                          )}
                      </div>
                      <div className="flex flex-none gap-2">
                        <button
                          type="button"
                          onClick={() => openProcedureEditor(stage.id, proc)}
                          className="btn btn-ghost btn-sm"
                        >
                          Оновити
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateStage(stage.id, {
                              ...stage,
                              procedures: stage.procedures.filter(
                                (p) => p._id !== proc._id,
                              ),
                            })
                          }
                          className="chip-remove"
                          aria-label="Видалити процедуру"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={proc.comment || ""}
                      onChange={(e) =>
                        updateStage(stage.id, {
                          ...stage,
                          procedures: stage.procedures.map((p) =>
                            p._id === proc._id
                              ? { ...p, comment: e.target.value }
                              : p,
                          ),
                        })
                      }
                      placeholder="Коментар до процедури"
                      rows={2}
                      className="field-textarea mt-2.5 w-full min-h-[60px] resize-y text-[13.5px]"
                    />
                  </div>
                ))}
              </div>
            ))}

            <button
              type="button"
              onClick={addStage}
              className="btn btn-ghost btn-sm mt-3"
            >
              + Додати етап
            </button>
          </ReportSection>

          {procedureStages.some((s) => s.procedures.length > 0) && (
            <ReportSection title="Рекомендації щодо процедур">
              <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
                {[
                  ...new Map(
                    procedureStages
                      .flatMap((s) => s.procedures)
                      .map((p) => [p.name, p.recommendation]),
                  ).entries(),
                ].map(([name, rec]) => (
                  <li key={name}>
                    <strong className="text-ink">{name}:</strong>{" "}
                    <FormattedText
                      markdown={rec}
                      fallback="Рекомендація відсутня"
                      className="inline"
                    />
                  </li>
                ))}
              </ul>
            </ReportSection>
          )}

          <ReportSection title="Все, що необхідно знати про ваш стан">
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Необхідна інформація"
              rows={4}
              className="field-textarea w-full min-h-[90px] resize-y"
            />
          </ReportSection>

          <ReportComments comments={comments} setComments={setComments} />

          <ReportSection
            title="Текст у кінці рекомендаційного листа"
            actions={
              <button
                type="button"
                onClick={() => setFinalNote("")}
                className="btn btn-ghost btn-sm text-danger"
              >
                Очистити
              </button>
            }
          >
            <textarea
              value={finalNote}
              onChange={(e) => setFinalNote(e.target.value)}
              placeholder="Текст, який буде додано в кінець PDF"
              rows={4}
              className="field-textarea w-full min-h-[90px] resize-y"
            />
          </ReportSection>

          <ReportActions
            reportId={reportId}
            patient={patient}
            isSubmitting={isSubmitting}
            onExport={() =>
              generateReportPDF({
                patient,
                exams: selectedExams,
                medications: selectedMedications,
                procedures: procedureStages.flatMap((s) => s.procedures),
                procedureStages,
                specialists: selectedSpecialists,
                homeCares: selectedHomeCares,
                comments,
                additionalInfo,
                finalNote,
                doctorName:
                  getReportCreatorName(reportHistory) || user?.name || "",
              })
            }
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
