import {
  approveRegistration,
  getRegistrationRequests,
} from "#api/referenceApi";
import React, { useEffect, useState } from "react";

const RegistrationRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);

  const load = async () => {
    const r = await getRegistrationRequests();
    setRequests(r || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (id: string) => {
    await approveRegistration(id);
    void load();
  };

  return (
    <div>
      <p className="section-label">Запити на реєстрацію</p>
      <div className="flex flex-col gap-2.5">
        {requests.map((r) => {
          const fullName = [r.name, r.firstName, r.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();

          return (
            <div key={r._id} className="list-row flex-col items-stretch sm:flex-row sm:items-center">
              <div className="min-w-0">
                <div className="list-row-name">
                  {fullName || r.email || "Користувач без імені"}
                </div>
                <div className="list-row-sub">
                  {fullName ? r.email : "Email не вказано"}
                </div>
              </div>
              <div className="list-row-actions">
                <button onClick={() => approve(r._id)} className="btn btn-primary btn-sm">
                  Підтвердити
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RegistrationRequestsManager;
