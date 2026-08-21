import {
  approveRegistration,
  getRegistrationRequests,
  rejectRegistration,
  type IRegistrationRequest,
} from "#api/referenceApi";
import ConfirmModal from "#components/ConfirmModal";
import Spinner from "#components/Spinner";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

// Бекенд відповідає на колізії конкретним текстом («Користувач з таким email
// вже існує»). Загальне «Спробуйте ще раз» радило б адміну зробити те, що
// гарантовано не спрацює, тож повідомлення сервера має пріоритет.
const serverMessageOr = (err: unknown, fallback: string): string => {
  const message = axios.isAxiosError(err) && err.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
};

const RegistrationRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<IRegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingRequest, setRejectingRequest] =
    useState<IRegistrationRequest | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const load = useCallback(async () => {
    try {
      setHasError(false);
      const r = await getRegistrationRequests();
      const next = r || [];
      setRequests(next);
      // Синхронізуємо бейдж кількості запитів на табі «Запити» (ReferencePanel)
      window.dispatchEvent(
        new CustomEvent("registrationRequestsUpdated", { detail: next.length }),
      );
    } catch {
      // Подію не диспатчимо: бейдж має лишитися з попереднім значенням,
      // а не показати фальшивий нуль.
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Ретрай показує скелетони, щоб між скиданням hasError і відповіддю сервера
  // не блимнув фальшивий порожній стан «Немає нових запитів на реєстрацію».
  const handleRetry = useCallback(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string) => {
    setApprovingId(id);
    try {
      await approveRegistration(id);
      toast.success("Лікаря підтверджено.");
      await load();
    } catch (err) {
      toast.error(
        serverMessageOr(err, "Не вдалося підтвердити запит. Спробуйте ще раз."),
      );
      // Сервер міг видалити заявку разом із помилкою (колізія email), тож
      // перечитуємо список і в невдалій гілці — інакше рядок висить до
      // ручного перезавантаження, а повторна спроба дає «Запит не знайдено».
      await load();
    } finally {
      setApprovingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    setIsRejecting(true);
    try {
      await rejectRegistration(rejectingRequest._id);
      setRejectingRequest(null);
      toast.success("Запит відхилено.");
      await load();
    } catch (err) {
      toast.error(
        serverMessageOr(err, "Не вдалося відхилити запит. Спробуйте ще раз."),
      );
      // Модалку закриваємо разом із перечитуванням: якщо заявки на сервері
      // вже немає, вона лишилась би відкритою на неіснуючому запиті.
      setRejectingRequest(null);
      await load();
    } finally {
      setIsRejecting(false);
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
      ) : hasError ? (
        <div className="w-full py-8 text-center">
          <p className="font-bold mb-1.5">Не вдалося завантажити запити</p>
          <p className="text-ink-soft mb-4">
            Перевірте зʼєднання з інтернетом і спробуйте ще раз.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="btn btn-tint btn-sm"
          >
            Спробувати ще раз
          </button>
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
                  <button
                    onClick={() => setRejectingRequest(r)}
                    className="btn btn-sm btn-danger-soft"
                  >
                    Відхилити
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        visible={Boolean(rejectingRequest)}
        title="Відхилити запит"
        message={`Відхилити запит на реєстрацію від ${
          rejectingRequest?.name?.trim() || rejectingRequest?.email
        }? Запит буде видалено, акаунт не буде створено.`}
        confirmLabel="Відхилити"
        isDanger
        isLoading={isRejecting}
        loadingLabel="Відхиляємо…"
        onConfirm={() => void handleConfirmReject()}
        onCancel={() => setRejectingRequest(null)}
      />
    </div>
  );
};

export default RegistrationRequestsManager;
