import mongoose from "mongoose";
import Report, {
  type IReport,
  type IReportEditHistoryItem,
  type IReportHomeCare,
} from "../models/ReportSchema";

interface ReportActor {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
}

const normalizeNamedItems = (
  items: Array<{
    name?: string;
    recommendation?: string;
    comment?: string;
    stage?: string;
  }> = [],
) =>
  items.map((item) => ({
    name: item.name?.trim() || "",
    recommendation: item.recommendation?.trim() || "",
    comment: item.comment?.trim() || "",
    stage: item.stage?.trim() || "",
  }));

const normalizeSpecialists = (
  items: Array<{ name?: string; query?: string }> = [],
) =>
  items.map((item) => ({
    name: item.name?.trim() || "",
    query: item.query?.trim() || "",
  }));

const normalizeHomeCares = (items: IReportHomeCare[] = []): IReportHomeCare[] =>
  items.map((item) => ({
    _id: item._id || new mongoose.Types.ObjectId().toString(),
    name: item.name?.trim() || "",
    morning: Boolean(item.morning),
    evening: Boolean(item.evening),
    medicationName: item.medicationName?.trim() || "",
    recommendations: item.recommendations?.trim() || "",
  }));

const normalizeProcedureStages = (stages: IReport["procedureStages"] = []) =>
  stages.map((stage) => ({
    stage: stage.stage?.trim() || "",
    procedures: (stage.procedures || []).map((procedure) => ({
      _id: procedure._id || new mongoose.Types.ObjectId().toString(),
      name: procedure.name?.trim() || "",
      comment: procedure.comment?.trim() || "",
      recommendation: procedure.recommendation?.trim() || "",
    })),
  }));

const createHistoryItem = (
  action: "create" | "update",
  actor?: ReportActor,
): IReportEditHistoryItem => ({
  action,
  editedAt: new Date(),
  userId: actor?.id || "",
  email: actor?.email || "",
  name: actor?.name || "",
  role: actor?.role || "",
});

const buildReportPayload = (data: Partial<IReport>) => ({
  patient: data.patient,
  medications: normalizeNamedItems(data.medications).map((item) => ({
    name: item.name,
    recommendation: item.recommendation,
  })),
  procedures: normalizeNamedItems(data.procedures).map((item) => ({
    name: item.name,
    recommendation: item.recommendation,
    comment: item.comment,
    stage: item.stage,
  })),
  procedureStages: normalizeProcedureStages(data.procedureStages),
  exams: normalizeNamedItems(data.exams).map((item) => ({
    name: item.name,
    recommendation: item.recommendation,
  })),
  specialists: normalizeSpecialists(data.specialists),
  homeCares: normalizeHomeCares(data.homeCares),
  additionalInfo: data.additionalInfo?.trim() || "",
  finalNote: data.finalNote?.trim() || "",
  comments: data.comments?.trim() || "",
});

export const create = async (data: Partial<IReport>, actor?: ReportActor) => {
  const reportData = buildReportPayload(data);

  return Report.create({
    ...reportData,
    editHistory: [createHistoryItem("create", actor)],
  });
};

export const getAll = async () => Report.find();
export const getById = async (id: string) => Report.findById(id);
export const getByPatientId = async (patientId: string) =>
  Report.findOne({ patient: patientId });

export const getLastVisitMap = async (
  patientIds: (string | mongoose.Types.ObjectId)[],
): Promise<Map<string, Date>> => {
  const reports = await Report.find(
    { patient: { $in: patientIds } },
    { patient: 1, updatedAt: 1 },
  );

  return new Map(reports.map((r) => [r.patient.toString(), r.updatedAt]));
};

export const update = async (
  id: string,
  data: Partial<IReport>,
  actor?: ReportActor,
) => {
  const reportData = buildReportPayload(data);
  const existing = await Report.findById(id);

  if (!existing) {
    return null;
  }

  const editHistory = [
    ...(existing.editHistory || []),
    createHistoryItem("update", actor),
  ];

  return Report.findByIdAndUpdate(
    id,
    {
      ...reportData,
      editHistory,
    },
    { new: true },
  );
};
