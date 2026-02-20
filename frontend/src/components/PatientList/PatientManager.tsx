import type { IPatient } from "#api/patientsApi";
import CRUDManager from "#components/CRUDManager";

export default function PatientManager() {
  return (
    <CRUDManager<IPatient>
      title="Пацієнти"
      apiPath="patients"
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
