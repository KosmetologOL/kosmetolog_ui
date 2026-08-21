import type {
  IReport,
  IReportProcedure,
  IReportProcedureStage,
} from "#api/reportsApi";

/**
 * Групування процедур старого (доетапного) формату за назвою етапу.
 * Єдине джерело цієї логіки — її використовують і форма листа, і
 * нормалізація звіту для експорту.
 */
export const groupProceduresByStage = (
  procedures: IReportProcedure[],
): { title: string; procedures: IReportProcedure[] }[] => {
  const grouped = procedures.reduce(
    (acc, proc) => {
      const stageName = proc.stage || "Етап 1";
      if (!acc[stageName]) acc[stageName] = [];
      acc[stageName].push(proc);
      return acc;
    },
    {} as Record<string, IReportProcedure[]>
  );

  return Object.entries(grouped).map(([stageName, stageProcedures]) => ({
    title: stageName,
    procedures: stageProcedures,
  }));
};

export const normalizeProcedureStages = (
  report: Pick<IReport, "procedures" | "procedureStages">
) => {
  if (
    Array.isArray(report.procedureStages) &&
    report.procedureStages.length > 0
  ) {
    return report.procedureStages.map((stage: IReportProcedureStage) => ({
      title: stage.stage,
      workWithEnabled: stage.workWithEnabled ?? false,
      workWith: stage.workWith ?? "",
      procedures: stage.procedures ?? [],
    }));
  }

  if (Array.isArray(report.procedures) && report.procedures.length > 0) {
    return groupProceduresByStage(report.procedures).map((stage) => ({
      title: stage.title,
      workWithEnabled: false,
      workWith: "",
      procedures: stage.procedures,
    }));
  }

  return [];
};
