import {
  approveRegistration,
  getRegistrationRequests,
  type IRegistrationRequest,
} from "#api/referenceApi";
import Spinner from "#components/Spinner";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const RegistrationRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<IRegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await getRegistrationRequests();
      const next = r || [];
      setRequests(next);
      // Синхронізуємо бейдж кількості запитів на табі «Запити» (ReferencePanel)
      window.dispatchEvent(
        new CustomEvent("registrationRequestsUpdated", { detail: next.length }),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string) => {
    setApprovingId(id);
    try {
      await approveRegistration(id);
      toast.success("Лікаря підтверджено.");
      await load();
    } catch {
      toast.error("Не вдалося підтвердити запит. Спробуйте ще раз.");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="flex w-full flex-col items-start">
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="panel-title">Запити на реєстрацію</h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            Очікують підтвердження: {requests.length}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex w-full flex-col gap-2.5" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="list-row">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-4 w-44 max-w-full" />
                <div className="skeleton mt-2.5 h-3 w-56 max-w-full" />
              </div>
              <div className="list-row-actions">
                <div className="skeleton h-9.5 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <p className="w-full py-8 text-center text-ink-soft">
          Немає нових запитів на реєстрацію
        </p>
      ) : (
        <div className="flex w-full flex-col gap-2.5">
          {requests.map((r, index) => {
            const fullName = r.name?.trim() ?? "";
            const isApproving = approvingId === r._id;

            return (
              <div
                key={r._id}
                className="list-row anim-rise flex-col items-stretch sm:flex-row sm:items-center"
                style={{ "--stagger": Math.min(index, 10) } as React.CSSProperties}
              >
                <div className="min-w-0">
                  <div className="list-row-name">
                    {fullName || r.email || "Користувач без імені"}
                  </div>
                  <div className="list-row-sub">
                    {fullName ? r.email : "Email не вказано"}
                  </div>
                </div>
                <div className="list-row-actions">
                  <button
                    onClick={() => void approve(r._id)}
                    disabled={isApproving}
                    className="btn btn-primary btn-sm"
                  >
                    {isApproving ? (
                      <>
                        <Spinner />
                        Підтверджуємо…
                      </>
                    ) : (
                      "Підтвердити"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RegistrationRequestsManager;
