import {
  ensureReportsDirectoryHandle,
  isFileSystemAccessSupported,
} from "./pdfSaveLocation";

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

export type SaveHtmlResult =
  | { status: "saved-to-folder" }
  | {
      status: "downloaded";
      reason: "unsupported" | "no-folder" | "permission-denied" | "write-failed";
    };

export const saveHtmlBlob = async (
  fileName: string,
  blob: Blob,
  directoryHandle?: FileSystemDirectoryHandle | null,
): Promise<SaveHtmlResult> => {
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
    console.error("Не вдалося записати HTML-файл у вибрану папку:", err);
    downloadBlob(fileName, blob);
    return { status: "downloaded", reason: "write-failed" };
  }
};
