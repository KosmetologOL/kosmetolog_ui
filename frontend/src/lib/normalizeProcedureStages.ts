import type { IProcedure } from "#api/proceduresApi";

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

interface Report {
  procedures?: ReportProcedure[];
  procedureStages?: ReportProcedureStage[];
}
export const normalizeProcedureStages = (report: Report) => {
  if (
    Array.isArray(report.procedureStages) &&
    report.procedureStages.length > 0
  ) {
    return report.procedureStages.map((stage: ReportProcedureStage) => ({
      title: stage.stage,
      procedures: (stage.procedures ?? []) as (IProcedure & {
        comment?: string;
      })[],
    }));
  }

  if (Array.isArray(report.procedures) && report.procedures.length > 0) {
    const grouped = (report.procedures as ReportProcedure[]).reduce(
      (acc, proc) => {
        const stageName = proc.stage || "Етап 1";
        if (!acc[stageName]) acc[stageName] = [];
        acc[stageName].push(proc);
        return acc;
      },
      {} as Record<string, ReportProcedure[]>
    );

    return Object.entries(grouped).map(([stageName, procedures]) => ({
      title: stageName,
      procedures: procedures as (IProcedure & { comment?: string })[],
    }));
  }

  return [];
};
