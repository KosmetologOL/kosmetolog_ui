import type {
  ReferenceDump,
  SyncCategory,
  SyncHomeCare,
  SyncItem,
} from "#api/referenceSyncApi";

/*
  Книга довідників: один XLSX, вкладка на кожен довідник + вкладка на кожну
  категорію. Бібліотеки читання/запису важать разом ~80 КБ і вантажаться
  динамічним імпортом — щоб не тягнути їх у бандл усім, хто просто відкрив
  застосунок (той самий підхід, що з @react-pdf/renderer).

  Колонка «ID» службова: її заповнює експорт, і саме вона дозволяє серверу
  зрозуміти, що рядок із новою назвою — це перейменований запис, а не новий.
*/

const SHEET_LABELS = {
  exams: "Обстеження",
  medications: "Засоби",
  procedures: "Процедури",
  specialists: "Спеціалісти",
  homeCares: "Домашній догляд",
  categories: "Категорії",
} as const;

const YES = "так";
const NO = "ні";

/** Excel: назва аркуша ≤31 символ і без : \ / ? * [ ] */
const sanitizeSheetName = (name: string): string =>
  name.replace(/[:\\/?*[\]]/g, "-").trim().slice(0, 31) || "Без назви";

/** Аркуші не можуть повторюватись — до дублікатів дописуємо номер. */
const uniqueSheetName = (name: string, taken: Set<string>): string => {
  const base = sanitizeSheetName(name);
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }

  for (let i = 2; i < 1000; i++) {
    const candidate = sanitizeSheetName(`${base.slice(0, 27)} (${i})`);
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }

  return base;
};

type Cell = { value: string; fontWeight?: "bold" };

const header = (titles: string[]): Cell[] =>
  titles.map((value) => ({ value, fontWeight: "bold" as const }));

const textRow = (values: Array<string | undefined>): Cell[] =>
  values.map((value) => ({ value: value ?? "" }));

const itemSheet = (items: SyncItem[]): Cell[][] => [
  header(["ID", "Назва", "Рекомендація"]),
  ...items.map((item) => textRow([item.id, item.name, item.recommendation])),
];

const specialistSheet = (items: SyncItem[]): Cell[][] => [
  header(["ID", "Назва"]),
  ...items.map((item) => textRow([item.id, item.name])),
];

const homeCareSheet = (items: SyncHomeCare[]): Cell[][] => [
  header(["ID", "Назва", "Ранок", "Вечір"]),
  ...items.map((item) =>
    textRow([item.id, item.name, item.morning ? YES : NO, item.evening ? YES : NO]),
  ),
];

const categoriesSheet = (
  categories: SyncCategory[],
  sheetNames: Map<string, string>,
): Cell[][] => [
  header([
    "ID",
    "Назва",
    "Аркуш",
    "Показувати назву",
    "Позиція в листі",
    "Важлива примітка",
  ]),
  ...categories.map((category) =>
    textRow([
      category.id,
      category.name,
      sheetNames.get(category.id ?? category.name),
      category.showNameInReport === false ? NO : YES,
      category.reportPosition,
      category.importantNote,
    ]),
  ),
];

export const buildReferenceWorkbook = async (
  dump: ReferenceDump,
): Promise<Blob> => {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  // Експорт із сервера завжди повний, але тип дампа спільний з імпортом, де
  // розділ може бути відсутнім — тому підстраховуємось порожніми списками.
  const categories = dump.categories ?? [];

  const taken = new Set<string>();
  const sheetNames = new Map<string, string>();
  for (const label of Object.values(SHEET_LABELS)) taken.add(label);
  for (const category of categories) {
    sheetNames.set(
      category.id ?? category.name,
      uniqueSheetName(category.name, taken),
    );
  }

  const sheets = [
    SHEET_LABELS.exams,
    SHEET_LABELS.medications,
    SHEET_LABELS.procedures,
    SHEET_LABELS.specialists,
    SHEET_LABELS.homeCares,
    SHEET_LABELS.categories,
    ...categories.map(
      (category) => sheetNames.get(category.id ?? category.name)!,
    ),
  ];

  const data: Cell[][][] = [
    itemSheet(dump.exams ?? []),
    itemSheet(dump.medications ?? []),
    itemSheet(dump.procedures ?? []),
    specialistSheet(dump.specialists ?? []),
    homeCareSheet(dump.homeCares ?? []),
    categoriesSheet(categories, sheetNames),
    ...categories.map((category) => itemSheet(category.items ?? [])),
  ];

  return writeXlsxFile(
    data.map((rows, index) => ({
      sheet: sheets[index],
      data: rows,
      // Назви й рекомендації довгі — без явних ширин усе злипається в стовпчик.
      columns: rows[0]?.map((_, column) => ({ width: column === 0 ? 26 : 42 })),
    })),
  ).toBlob();
};

type Matrix = Array<Array<string | number | boolean | Date | null>>;

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? YES : NO;
  return String(value).trim();
};

const isYes = (value: unknown): boolean => {
  const text = cellText(value).toLowerCase();
  return text === YES || text === "yes" || text === "true" || text === "1" || text === "+";
};

/** Індекси колонок за назвами заголовка — щоб порядок колонок не був жорстким. */
const columnIndexes = (headerRow: Matrix[number]): Map<string, number> => {
  const map = new Map<string, number>();
  headerRow.forEach((cell, index) => {
    const key = cellText(cell).toLowerCase();
    if (key && !map.has(key)) map.set(key, index);
  });
  return map;
};

const readItems = (rows: Matrix): SyncItem[] => {
  if (rows.length < 2) return [];
  const columns = columnIndexes(rows[0]);
  const idIdx = columns.get("id");
  const nameIdx = columns.get("назва");
  const recIdx = columns.get("рекомендація");
  if (nameIdx === undefined) return [];

  return rows
    .slice(1)
    .map((row) => ({
      id: idIdx === undefined ? undefined : cellText(row[idIdx]) || undefined,
      name: cellText(row[nameIdx]),
      recommendation: recIdx === undefined ? "" : cellText(row[recIdx]),
    }))
    .filter((item) => item.name !== "");
};

const readHomeCares = (rows: Matrix): SyncHomeCare[] => {
  if (rows.length < 2) return [];
  const columns = columnIndexes(rows[0]);
  const idIdx = columns.get("id");
  const nameIdx = columns.get("назва");
  const morningIdx = columns.get("ранок");
  const eveningIdx = columns.get("вечір");
  if (nameIdx === undefined) return [];

  return rows
    .slice(1)
    .map((row) => ({
      id: idIdx === undefined ? undefined : cellText(row[idIdx]) || undefined,
      name: cellText(row[nameIdx]),
      morning: morningIdx === undefined ? false : isYes(row[morningIdx]),
      evening: eveningIdx === undefined ? false : isYes(row[eveningIdx]),
    }))
    .filter((item) => item.name !== "");
};

export interface ParsedWorkbook {
  dump: ReferenceDump;
  /** Аркуші, які не вдалося зіставити з жодним відомим розділом. */
  ignoredSheets: string[];
}

export const parseReferenceWorkbook = async (
  file: File,
): Promise<ParsedWorkbook> => {
  const { default: readXlsxFile } = await import("read-excel-file/browser");

  // У v9 виклик без `sheet` повертає одразу всі аркуші книги.
  const workbook = await readXlsxFile(file);
  const sheetNames = workbook.map((sheet) => sheet.sheet);
  const bySheet = new Map<string, Matrix>(
    workbook.map((sheet) => [sheet.sheet, sheet.data as Matrix]),
  );

  const categoriesRows = bySheet.get(SHEET_LABELS.categories) ?? [];
  const categories: SyncCategory[] = [];
  const usedSheets = new Set<string>(Object.values(SHEET_LABELS));

  if (categoriesRows.length >= 2) {
    const columns = columnIndexes(categoriesRows[0]);
    const idIdx = columns.get("id");
    const nameIdx = columns.get("назва");
    const sheetIdx = columns.get("аркуш");
    const showIdx = columns.get("показувати назву");
    const positionIdx = columns.get("позиція в листі");
    const noteIdx = columns.get("важлива примітка");

    for (const row of categoriesRows.slice(1)) {
      const name = nameIdx === undefined ? "" : cellText(row[nameIdx]);
      if (!name) continue;

      // Вкладка може називатись інакше за категорію (обрізана до 31 символу),
      // тому спершу дивимось у колонку «Аркуш», і лише потім — на саму назву.
      const declaredSheet = sheetIdx === undefined ? "" : cellText(row[sheetIdx]);
      const sheetName = bySheet.has(declaredSheet)
        ? declaredSheet
        : bySheet.has(sanitizeSheetName(name))
          ? sanitizeSheetName(name)
          : "";

      if (sheetName) usedSheets.add(sheetName);

      categories.push({
        id: idIdx === undefined ? undefined : cellText(row[idIdx]) || undefined,
        name,
        showNameInReport: showIdx === undefined ? true : isYes(row[showIdx]),
        reportPosition:
          positionIdx === undefined ? undefined : cellText(row[positionIdx]) || undefined,
        importantNote: noteIdx === undefined ? "" : cellText(row[noteIdx]),
        // Вкладки цієї категорії в книзі немає — лишаємо `items` невизначеним,
        // щоб сервер не вирішив, що всі її записи треба видалити.
        items: sheetName ? readItems(bySheet.get(sheetName)!) : undefined,
      });
    }
  }

  // Вкладка без рядка в «Категоріях» — це нова категорія, названа вкладкою.
  for (const sheet of sheetNames) {
    if (usedSheets.has(sheet)) continue;
    const rows = bySheet.get(sheet) ?? [];
    const items = readItems(rows);
    if (items.length === 0) continue;

    usedSheets.add(sheet);
    categories.push({ name: sheet, items });
  }

  /*
    Розділ потрапляє в дамп ЛИШЕ якщо його аркуш був у книзі. Інакше поле
    лишається `undefined`, і сервер такий розділ не чіпає. Це рятує від
    найгіршого сценарію: книга з одним аркушем «Засоби» плюс галочка
    «видаляти зайве» раніше зносила всі решту довідників.
  */
  const section = <T>(label: string, read: (rows: Matrix) => T[]): T[] | undefined =>
    bySheet.has(label) ? read(bySheet.get(label)!) : undefined;

  return {
    dump: {
      exams: section(SHEET_LABELS.exams, readItems),
      medications: section(SHEET_LABELS.medications, readItems),
      procedures: section(SHEET_LABELS.procedures, readItems),
      specialists: section(SHEET_LABELS.specialists, readItems),
      homeCares: section(SHEET_LABELS.homeCares, readHomeCares),
      categories: categories.length > 0 || bySheet.has(SHEET_LABELS.categories)
        ? categories
        : undefined,
    },
    ignoredSheets: sheetNames.filter((sheet) => !usedSheets.has(sheet)),
  };
};

export const downloadWorkbook = (fileName: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
