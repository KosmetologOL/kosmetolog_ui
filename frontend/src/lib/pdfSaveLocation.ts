import { isAbortError } from "./abortError";

const DB_NAME = "kosmetolog-fs-handles";
const STORE_NAME = "handles";
const DIRECTORY_KEY = "reportsFolder";

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const idbGet = async <T>(key: string): Promise<T | undefined> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
};

const idbSet = async (key: string, value: unknown): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const isFileSystemAccessSupported = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.showDirectoryPicker === "function";

export const getSavedDirectoryHandle =
  async (): Promise<FileSystemDirectoryHandle | null> => {
    if (!isFileSystemAccessSupported()) return null;

    try {
      const handle = await idbGet<FileSystemDirectoryHandle>(DIRECTORY_KEY);
      return handle ?? null;
    } catch {
      return null;
    }
  };

const verifyDirectoryPermission = async (
  handle: FileSystemDirectoryHandle,
): Promise<boolean> => {
  const descriptor = { mode: "readwrite" as const };
  if ((await handle.queryPermission(descriptor)) === "granted") return true;
  try {
    return (await handle.requestPermission(descriptor)) === "granted";
  } catch {
    return false;
  }
};

export const chooseReportsDirectory =
  async (): Promise<FileSystemDirectoryHandle | null> => {
    if (!isFileSystemAccessSupported()) return null;

    let handle: FileSystemDirectoryHandle;
    try {
      handle = await window.showDirectoryPicker({
        id: "reports-folder",
        mode: "readwrite",
      });
    } catch (err) {
      // Натиснули «Скасувати» — пробрасуємо AbortError далі, щоб виклик
      // згори перервав експорт. Раніше тут поверталося null, і файл усе
      // одно потрапляв у теку завантажень попри скасування.
      if (isAbortError(err)) throw err;
      console.error("Не вдалося відкрити діалог вибору папки:", err);
      return null;
    }

    try {
      await idbSet(DIRECTORY_KEY, handle);
    } catch (err) {
      // Папку не запам'ятали, але експортувати в неї зараз можна.
      console.error("Не вдалося запам'ятати вибрану папку:", err);
    }

    return handle;
  };

export const ensureReportsDirectoryHandle =
  async (): Promise<FileSystemDirectoryHandle | null> => {
    if (!isFileSystemAccessSupported()) return null;

    const saved = await getSavedDirectoryHandle();
    if (saved && (await verifyDirectoryPermission(saved))) {
      return saved;
    }

    return chooseReportsDirectory();
  };
