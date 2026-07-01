import { getDoctors, setUserActive } from "#api/referenceApi";
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

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Керування лікарями</h2>
      <div className="space-y-2">
        {doctors.map((d) => (
          <div
            key={d._id}
            className="flex items-center justify-between rounded border p-3"
          >
            <div className="font-medium">{d.email}</div>
            <div>
              <button
                onClick={() => toggle(d._id, d.active)}
                className={`rounded px-3 py-1 text-sm ${d.active ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
              >
                {d.active ? "Деактивувати" : "Активувати"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoctorsManager;
