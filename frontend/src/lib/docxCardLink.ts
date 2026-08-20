import toast from "react-hot-toast";

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

export type PickDocxResult =
  | { status: "picked"; handle: FileSystemFileHandle }
  | { status: "cancelled" }
  | { status: "picker-failed" }
  | { status: "permission-denied" };

// Жоден handle не запам'ятовується між викликами — пацієнтів багато, і кожен
// раз лікар свідомо обирає файл картки саме того пацієнта, з яким працює.
export const pickPatientDocxFile = async (): Promise<PickDocxResult> => {
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

    if (!(await verifyDocxFilePermission(handle))) {
      return { status: "permission-denied" };
    }
    return { status: "picked", handle };
  } catch (err) {
    // Escape/«Скасувати» у пікері — це AbortError, а не збій: мовчимо.
    if ((err as DOMException)?.name === "AbortError") {
      return { status: "cancelled" };
    }
    console.error("Не вдалося відкрити вибір файлу картки пацієнта:", err);
    return { status: "picker-failed" };
  }
};

/**
 * Приводить назву файлу та ПІБ до спільного вигляду для звірки:
 * NFC (macOS віддає назви файлів у NFC), нижній регістр, розділювачі —
 * у пробіли, усі варіанти апострофа — в один, зайві пробіли стиснуто.
 */
const normalizeForCardMatch = (value: string): string =>
  value
    .normalize("NFC")
    .toLowerCase()
    .replace(/\.docx$/, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/[ʼ‘’']/g, "ʼ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Чи схожа назва файлу на картку саме цього пацієнта: шукаємо прізвище
 * (перше слово ПІБ) у назві. Без ПІБ звіряти нема з чим — вважаємо, що збіг є.
 */
export const looksLikePatientCard = (
  fileName: string,
  fullName?: string,
): boolean => {
  const normalizedFullName = normalizeForCardMatch(fullName ?? "");
  if (!normalizedFullName) return true;

  const surname = normalizedFullName.split(" ")[0];
  if (!surname) return true;

  return normalizeForCardMatch(fileName).includes(surname);
};

/**
 * Вибір картки пацієнта з поясненням користувачу, що пішло не так.
 * Викликати ДО збереження листа: showOpenFilePicker вимагає свіжої
 * взаємодії користувача і після довгого await кидає SecurityError.
 */
export const pickPatientDocxCard = async (
  patientFullName?: string,
): Promise<FileSystemFileHandle | null> => {
  if (!isDocxLinkingSupported()) {
    toast.error(
      "Автоматичне додавання в картку доступне лише в Chrome або Edge.",
    );
    return null;
  }

  const result = await pickPatientDocxFile();

  if (result.status === "cancelled") return null;

  if (result.status === "picker-failed") {
    toast.error("Не вдалося відкрити вибір файлу — спробуйте ще раз.");
    return null;
  }

  if (result.status === "permission-denied") {
    toast.error("Немає дозволу на запис у файл картки.");
    return null;
  }

  const { handle } = result;

  if (!looksLikePatientCard(handle.name, patientFullName)) {
    const confirmed = window.confirm(
      `Вибраний файл «${handle.name}» не схожий на картку пацієнта «${patientFullName}». Все одно дописати лист у цей файл?`,
    );
    if (!confirmed) return null;
  }

  return handle;
};
