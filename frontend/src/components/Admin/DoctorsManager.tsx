import { deleteDoctor, getDoctors, setUserActive } from "#api/referenceApi";
import React, { useEffect, useState } from "react";

const DoctorsManager: React.FC = () => {
  const [doctors, setDoctors] = useState<any[]>([]);

  const load = async () => {
    const d = await getDoctors();
    setDoctors(d || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = async (id: string, active: boolean) => {
    await setUserActive(id, !active);
    void load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Видалити цього лікаря?")) return;
    await deleteDoctor(id);
    void load();
  };

  return (
    <div>
      <p className="section-label">Керування лікарями</p>
      <div className="flex flex-col gap-2.5">
        {doctors.map((d) => {
          const fullName = [d.firstName, d.lastName, d.name]
            .filter(Boolean)
            .join(" ")
            .trim();

          return (
            <div key={d._id} className="list-row flex-col items-stretch sm:flex-row sm:items-center">
              <div className="min-w-0">
                <div className="list-row-name">
                  {fullName || d.email || "Лікар без імені"}
                </div>
                <div className="list-row-sub">
                  {fullName ? d.email : "Email не вказано"}
                </div>
              </div>
              <div className="list-row-actions">
                <button
                  onClick={() => toggle(d._id, d.active)}
                  className={`btn btn-ghost btn-sm ${d.active ? "text-danger" : ""}`}
                >
                  {d.active ? "Деактивувати" : "Активувати"}
                </button>
                <button
                  onClick={() => remove(d._id)}
                  className="btn btn-ghost btn-sm text-danger"
                >
                  Видалити
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DoctorsManager;
