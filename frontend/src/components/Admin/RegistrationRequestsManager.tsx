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
      <h2 className="mb-4 text-lg font-semibold">Запити на реєстрацію</h2>
      <div className="space-y-2">
        {requests.map((r) => {
          const fullName = [r.name, r.firstName, r.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();

          return (
            <div
              key={r._id}
              className="flex items-center justify-between rounded border p-3"
            >
              <div className="min-w-0">
                <div className="font-medium">
                  {fullName || r.email || "Користувач без імені"}
                </div>
                <div className="text-sm text-gray-600">
                  {fullName ? r.email : "Email не вказано"}
                </div>
              </div>
              <div>
                <button
                  onClick={() => approve(r._id)}
                  className="rounded bg-green-600 px-3 py-1.5 text-white"
                >
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
