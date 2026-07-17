import CRUDManager from "#components/CRUDManager";

export default function ExamsManager({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  return (
    <CRUDManager
      title="Обстеження"
      apiPath="exams"
      hasRecommendation
      readOnly={readOnly}
      enableCsvImportExport
    />
  );
}
