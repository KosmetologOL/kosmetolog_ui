import CRUDManager from "#components/CRUDManager";

export default function SpecialistsManager({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  return <CRUDManager title="Спеціалісти" apiPath="specialists" readOnly={readOnly} />;
}
