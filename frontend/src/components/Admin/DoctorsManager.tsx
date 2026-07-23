import { deleteDoctor, getDoctors, setUserActive } from "#api/referenceApi";
import ConfirmModal from "#components/ConfirmModal";
import React, { useEffect, useState } from "react";

const DoctorsManager: React.FC = () => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    await deleteDoctor(deletingId);
    setDeletingId(null);
    void load();
  };

  return (
    <div className="flex w-full flex-col items-start">
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[21px] tracking-[0.08em] uppercase font-bold text-ink">
            Список лікарів
          </h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Усього лікарів: {doctors.length}
          </p>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2.5">
        {doctors.map((d) => {
          const fullName = [d.firstName, d.lastName, d.name]
            .filter(Boolean)
            .join(" ")
            .trim();

          return (
            <div key={d._id} className="list-row flex-col items-stretch sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="list-row-name">
                    {fullName || d.email || "Лікар без імені"}
                  </span>
                  <span
                    className={`pill ${
                      d.active
                        ? "bg-brand/15 text-brand border-brand/30"
                        : "bg-danger/15 text-danger border-danger/30"
                    }`}
                  >
                    {d.active ? "Активний" : "Неактивний"}
                  </span>
                </div>
                <div className="list-row-sub mt-1">
                  {fullName ? d.email : "Email не вказано"}
                </div>
              </div>
              <div className="list-row-actions mt-2 sm:mt-0">
                <button
                  onClick={() => toggle(d._id, d.active)}
                  className={`btn btn-sm w-[130px] justify-center ${
                    d.active
                      ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                      : "btn-primary"
                  }`}
                >
                  {d.active ? "Деактивувати" : "Активувати"}
                </button>
                <button
                  onClick={() => setDeletingId(d._id)}
                  className="btn btn-sm w-[130px] justify-center bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25"
                >
                  Видалити
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        visible={Boolean(deletingId)}
        title="Видалити лікаря"
        message="Ви впевнені, що хочете видалити акаунт цього лікаря? Цю дію неможливо скасувати."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};

export default DoctorsManager;
