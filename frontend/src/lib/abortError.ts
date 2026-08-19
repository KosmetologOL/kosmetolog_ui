// Скасування системного діалогу (вибір папки чи файлу) браузер повідомляє
// через DOMException з ім'ям "AbortError". Це навмисна дія користувача,
// а не помилка — тож обробляється окремо від справжніх збоїв.
export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";
