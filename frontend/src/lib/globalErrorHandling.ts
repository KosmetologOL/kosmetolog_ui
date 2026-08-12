import axios from "axios";
import toast from "react-hot-toast";

const FRIENDLY_MESSAGE =
  "Сталася технічна помилка на сервері. Спробуйте ще раз пізніше.";

export const setupGlobalErrorHandling = () => {
  window.addEventListener("unhandledrejection", (event) => {
    const reason: unknown = event.reason;

    // Скасовані запити (AbortController) — не помилка, тост не показуємо.
    if (axios.isCancel(reason)) {
      return;
    }

    if (!axios.isAxiosError(reason)) {
      return;
    }

    if (reason.response?.status === 401) {
      return;
    }

    console.error("Unhandled server error:", reason);
    toast.error(FRIENDLY_MESSAGE);
    event.preventDefault();
  });
};
