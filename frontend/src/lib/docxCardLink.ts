export const isDocxLinkingSupported = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.showOpenFilePicker === "function";

export const verifyDocxFilePermission = async (
  handle: FileSystemFileHandle,
): Promise<boolean> => {
  const descriptor = { mode: "readwrite" as const };
  if ((await handle.queryPermission(descriptor)) === "granted") return true;
  try {
    return (await handle.requestPermission(descriptor)) === "granted";
  } catch {
    return false;
  }
};

// Жоден handle не запам'ятовується між викликами — пацієнтів багато, і кожен
// раз лікар свідомо обирає файл картки саме того пацієнта, з яким працює.
export const pickPatientDocxFile = async (): Promise<FileSystemFileHandle | null> => {
  if (!isDocxLinkingSupported()) return null;

  try {
    const [handle] = await window.showOpenFilePicker({
      id: "patient-docx-card",
      types: [
        {
          description: "Word-документ",
          accept: {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
              [".docx"],
          },
        },
      ],
      excludeAcceptAllOption: true,
      multiple: false,
    });

    return (await verifyDocxFilePermission(handle)) ? handle : null;
  } catch {
    return null;
  }
};
