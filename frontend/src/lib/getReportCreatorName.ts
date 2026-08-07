import type { IReportEditHistoryItem } from "#api/reportsApi";

export const getReportCreatorName = (
  editHistory?: IReportEditHistoryItem[],
): string => {
  const createdEntry = editHistory?.find((entry) => entry.action === "create");
  return createdEntry?.name?.trim() || "";
};
