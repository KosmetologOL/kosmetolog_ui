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

    try {
      const handle = await window.showDirectoryPicker({
        id: "reports-folder",
        mode: "readwrite",
      });
      await idbSet(DIRECTORY_KEY, handle);
      return handle;
    } catch {
      return null;
    }
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

const downloadBlob = (fileName: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export type SavePdfResult =
  | { status: "saved-to-folder" }
  | {
      status: "downloaded";
      reason: "unsupported" | "no-folder" | "permission-denied" | "write-failed";
    };

export const savePdfBlob = async (
  fileName: string,
  blob: Blob,
  directoryHandle?: FileSystemDirectoryHandle | null,
): Promise<SavePdfResult> => {
  if (!isFileSystemAccessSupported()) {
    downloadBlob(fileName, blob);
    return { status: "downloaded", reason: "unsupported" };
  }

  const handle =
    directoryHandle !== undefined
      ? directoryHandle
      : await ensureReportsDirectoryHandle();

  if (!handle) {
    downloadBlob(fileName, blob);
    return { status: "downloaded", reason: "no-folder" };
  }

  if (!(await verifyDirectoryPermission(handle))) {
    downloadBlob(fileName, blob);
    return { status: "downloaded", reason: "permission-denied" };
  }

  try {
    const fileHandle = await handle.getFileHandle(fileName, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { status: "saved-to-folder" };
  } catch (err) {
    console.error("Не вдалося записати PDF у вибрану папку:", err);
    downloadBlob(fileName, blob);
    return { status: "downloaded", reason: "write-failed" };
  }
};
