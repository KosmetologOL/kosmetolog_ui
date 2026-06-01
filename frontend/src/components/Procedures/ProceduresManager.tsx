import CRUDManager from "#components/CRUDManager";

export default function ProceduresManager({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  return (
    <CRUDManager
      title="Процедури"
      apiPath="procedures"
      hasRecommendation
      readOnly={readOnly}
    />
  );
}
