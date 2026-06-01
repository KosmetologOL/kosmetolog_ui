import type { IPatient } from "#api/patientsApi";
import CRUDManager from "#components/CRUDManager";

export default function PatientManager({
  canDelete = true,
}: {
  canDelete?: boolean;
}) {
  return (
    <CRUDManager<IPatient>
      title="Пацієнти"
      apiPath="patients"
      canDelete={canDelete}
      mapItem={(p) => ({
        _id: p._id,
        name: `${p.fullName}`,
      })}
      mapToApi={(item) => ({
        fullName: item.name,
      })}
    />
  );
}
