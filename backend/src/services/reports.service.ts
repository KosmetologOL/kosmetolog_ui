import mongoose from "mongoose";
import Report, {
  type IReport,
  type IReportCategoryItem,
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

const normalizeCategories = (
  items: IReportCategoryItem[] = [],
): IReportCategoryItem[] =>
  items.map((item) => ({
    _id: item._id || new mongoose.Types.ObjectId().toString(),
    categoryId: item.categoryId || "",
    categoryName: item.categoryName?.trim() || "",
    itemName: item.itemName?.trim() || "",
    recommendation: item.recommendation?.trim() || "",
  }));

const normalizeProcedureStages = (stages: IReport["procedureStages"] = []) =>
  stages.map((stage) => ({
    stage: stage.stage?.trim() || "",
    workWithEnabled: Boolean(stage.workWithEnabled),
    workWith: stage.workWith?.trim() || "",
    procedures: (stage.procedures || []).map((procedure) => ({
      _id: procedure._id || new mongoose.Types.ObjectId().toString(),
      name: procedure.name?.trim() || "",
      comment: procedure.comment?.trim() || "",
      recommendation: procedure.recommendation?.trim() || "",
      zoneEnabled: Boolean(procedure.zoneEnabled),
      zone: procedure.zone?.trim() || "",
      intervalEnabled: Boolean(procedure.intervalEnabled),
      interval: procedure.interval?.trim() || "",
      visitCountEnabled: Boolean(procedure.visitCountEnabled),
      visitCount:
        typeof procedure.visitCount === "number" ? procedure.visitCount : null,
    })),
  }));

// Скільки останніх записів історії редагувань лишається в документі:
// $slice обрізає масив на боці MongoDB, тож він не росте безмежно.
const EDIT_HISTORY_LIMIT = 50;

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
  categories: normalizeCategories(data.categories),
  additionalInfo: data.additionalInfo?.trim() || "",
  finalNote: data.finalNote?.trim() || "",
  comments: data.comments?.trim() || "",
  medicationsNote: data.medicationsNote?.trim() || "",
  homeCareNote: data.homeCareNote?.trim() || "",
  examsNote: data.examsNote?.trim() || "",
  proceduresNote: data.proceduresNote?.trim() || "",
});

export const create = async (data: Partial<IReport>, actor?: ReportActor) => {
  const reportData = buildReportPayload(data);

  return Report.create({
    ...reportData,
    editHistory: [createHistoryItem("create", actor)],
  });
};

export const removeByPatientId = async (patientId: string) =>
  Report.deleteMany({ patient: patientId });
export const getById = async (id: string) => Report.findById(id);
export const getByPatientId = async (patientId: string) =>
  Report.findOne({ patient: patientId });

export const getLastVisitMap = async (
  patientIds: (string | mongoose.Types.ObjectId)[],
): Promise<Map<string, Date>> => {
  const reports = await Report.find(
    { patient: { $in: patientIds } },
    { patient: 1, updatedAt: 1 },
  ).lean();

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

  return Report.findByIdAndUpdate(
    id,
    {
      $set: reportData,
      $push: {
        editHistory: {
          $each: [createHistoryItem("update", actor)],
          $slice: -EDIT_HISTORY_LIMIT,
        },
      },
    },
    { new: true },
  );
};
