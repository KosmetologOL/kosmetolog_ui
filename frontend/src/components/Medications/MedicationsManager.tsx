import CRUDManager from "#components/CRUDManager";

export default function MedicationsManager({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  return (
    <CRUDManager
      title="Засоби"
      apiPath="medications"
      hasRecommendation
      readOnly={readOnly}
    />
  );
}
