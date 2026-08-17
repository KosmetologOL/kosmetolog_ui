import {
  deleteDoctor,
  getDoctors,
  setUserActive,
  type IDoctor,
} from "#api/referenceApi";
import ConfirmModal from "#components/ConfirmModal";
import Spinner from "#components/Spinner";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const DoctorsManager: React.FC = () => {
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deactivatingDoctor, setDeactivatingDoctor] = useState<IDoctor | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const d = await getDoctors();
      setDoctors(d || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const performToggle = async (doctor: IDoctor) => {
    setTogglingId(doctor._id);
    try {
      await setUserActive(doctor._id, !doctor.active);
      toast.success(
        doctor.active
          ? "Акаунт лікаря деактивовано."
          : "Акаунт лікаря активовано.",
      );
      await load();
    } catch {
      toast.error("Не вдалося змінити статус лікаря. Спробуйте ще раз.");
    } finally {
      setTogglingId(null);
    }
  };

  const toggle = (doctor: IDoctor) => {
    if (doctor.active) {
      setDeactivatingDoctor(doctor);
      return;
    }
    void performToggle(doctor);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingDoctor) return;
    await performToggle(deactivatingDoctor);
    setDeactivatingDoctor(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteDoctor(deletingId);
      setDeletingId(null);
      toast.success("Акаунт лікаря видалено.");
      void load();
    } catch {
      toast.error("Не вдалося видалити акаунт лікаря. Спробуйте ще раз.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-start">
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="panel-title">Список лікарів</h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            Усього лікарів: {doctors.length}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex w-full flex-col gap-2.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="list-row">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-4 w-44 max-w-full" />
                <div className="skeleton mt-2.5 h-3 w-56 max-w-full" />
              </div>
              <div className="list-row-actions">
                <div className="skeleton h-9.5 w-[130px]" />
                <div className="skeleton h-9.5 w-[130px]" />
              </div>
            </div>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <p className="w-full py-8 text-center text-ink-soft">Немає лікарів</p>
      ) : (
        <div className="flex w-full flex-col gap-2.5">
          {doctors.map((d, index) => {
            const fullName = d.name?.trim() ?? "";
            const isToggling = togglingId === d._id;

            return (
              <div
                key={d._id}
                className="list-row anim-rise flex-col items-stretch sm:flex-row sm:items-center"
                style={{ "--stagger": Math.min(index, 10) } as React.CSSProperties}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="list-row-name">
                      {fullName || d.email || "Лікар без імені"}
                    </span>
                    <span className={`pill ${d.active ? "is-on" : "is-danger"}`}>
                      {d.active ? "Активний" : "Неактивний"}
                    </span>
                  </div>
                  <div className="list-row-sub mt-1">
                    {fullName ? d.email : "Email не вказано"}
                  </div>
                </div>
                <div className="list-row-actions mt-2 sm:mt-0">
                  <button
                    onClick={() => toggle(d)}
                    disabled={isToggling}
                    className={`btn btn-sm min-w-[130px] justify-center ${
                      d.active ? "btn-ghost" : "btn-primary"
                    }`}
                  >
                    {isToggling ? (
                      <>
                        <Spinner />
                        Зберігаємо…
                      </>
                    ) : d.active ? (
                      "Деактивувати"
                    ) : (
                      "Активувати"
                    )}
                  </button>
                  <button
                    onClick={() => setDeletingId(d._id)}
                    className="btn btn-sm btn-danger-soft min-w-[130px] justify-center"
                  >
                    Видалити
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        visible={Boolean(deletingId)}
        title="Видалити лікаря"
        message="Ви впевнені, що хочете видалити акаунт цього лікаря? Цю дію неможливо скасувати."
        isLoading={isDeleting}
        loadingLabel="Видаляємо…"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />

      <ConfirmModal
        visible={Boolean(deactivatingDoctor)}
        title="Деактивувати лікаря"
        message={`Деактивувати акаунт лікаря ${
          deactivatingDoctor?.name?.trim() || deactivatingDoctor?.email
        }? Він втратить доступ до системи.`}
        confirmLabel="Деактивувати"
        isLoading={togglingId !== null}
        loadingLabel="Деактивуємо…"
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivatingDoctor(null)}
      />
    </div>
  );
};

export default DoctorsManager;
