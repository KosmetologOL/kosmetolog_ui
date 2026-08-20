import mongoose, { Model } from "mongoose";
import ActivityLog from "../models/ActivityLog";
import Category, { CATEGORY_REPORT_POSITIONS, CategoryReportPosition } from "../models/Category";
import CategoryItem from "../models/CategoryItem";
import Exam from "../models/ExamSchema";
import HomeCare from "../models/HomeCareSchema";
import Medication from "../models/MedicationSchema";
import Procedure from "../models/ProcedureSchema";
import Specialist from "../models/SpecialistSchema";

/*
  Масовий імпорт/експорт довідників (одна книга з аркушами на боці фронта).

  Ключове: план змін рахує ОДНА функція — buildImportPlan. І «прев'ю», і
  застосування викликають її на актуальному стані бази, тож показане адміну
  ніколи не розходиться з тим, що виконається. Клієнт надсилає лише вміст
  файлу; що з ним робити, вирішує сервер.
*/

export interface SyncItem {
  id?: string;
  name: string;
  recommendation?: string;
}

export interface SyncHomeCare extends SyncItem {
  morning?: boolean;
  evening?: boolean;
}

export interface SyncCategory {
  id?: string;
  name: string;
  showNameInReport?: boolean;
  reportPosition?: CategoryReportPosition;
  importantNote?: string;
  /** `undefined` — вкладки цієї категорії в книзі не було, записи не чіпаємо. */
  items?: SyncItem[];
}

/*
  Розділи опціональні навмисно. `undefined` означає «аркуша в книзі не було» і
  розділ не входить у план узагалі; порожній масив означає «аркуш є, але
  порожній» — тобто свідоме очищення. Без цієї різниці книга з одним аркушем
  «Засоби» при ввімкненому видаленні зносила всі інші довідники.
*/
export interface ReferenceDump {
  exams?: SyncItem[];
  medications?: SyncItem[];
  procedures?: SyncItem[];
  specialists?: SyncItem[];
  homeCares?: SyncHomeCare[];
  categories?: SyncCategory[];
}

/** Одна група змін у прев'ю — рівно те, що побачить адмін у таблиці. */
export interface SheetPlan {
  key: string;
  label: string;
  create: string[];
  update: string[];
  remove: string[];
  warnings: string[];
}

export interface ImportPlan {
  sheets: SheetPlan[];
  totals: { create: number; update: number; remove: number };
  /** Розділи, аркушів яких у книзі не було — вони лишаються без змін. */
  missingSections: string[];
}

const normalizeName = (name: string): string => name.trim().toLowerCase();

const isObjectId = (value?: string): boolean =>
  Boolean(value) && mongoose.Types.ObjectId.isValid(value!);

export const dumpReferences = async (): Promise<ReferenceDump> => {
  const [exams, medications, procedures, specialists, homeCares, categories, items] =
    await Promise.all([
      Exam.find().sort({ name: 1 }),
      Medication.find().sort({ name: 1 }),
      Procedure.find().sort({ name: 1 }),
      Specialist.find().sort({ name: 1 }),
      HomeCare.find().sort({ order: 1, _id: 1 }),
      Category.find().sort({ name: 1 }),
      CategoryItem.find().sort({ name: 1 }),
    ]);

  const itemsByCategory = new Map<string, SyncItem[]>();
  for (const item of items) {
    const key = String(item.category);
    const list = itemsByCategory.get(key) ?? [];
    list.push({
      id: String(item._id),
      name: item.name,
      recommendation: item.recommendation ?? "",
    });
    itemsByCategory.set(key, list);
  }

  const withRecommendation = (docs: Array<{ _id: unknown; name: string; recommendation?: string }>) =>
    docs.map((doc) => ({
      id: String(doc._id),
      name: doc.name,
      recommendation: doc.recommendation ?? "",
    }));

  return {
    exams: withRecommendation(exams),
    medications: withRecommendation(medications),
    procedures: withRecommendation(procedures),
    specialists: specialists.map((doc) => ({ id: String(doc._id), name: doc.name })),
    homeCares: homeCares.map((doc) => ({
      id: String(doc._id),
      name: doc.name,
      morning: doc.morning,
      evening: doc.evening,
    })),
    categories: categories.map((category) => ({
      id: String(category._id),
      name: category.name,
      showNameInReport: category.showNameInReport,
      reportPosition: category.reportPosition,
      importantNote: category.importantNote ?? "",
      items: itemsByCategory.get(String(category._id)) ?? [],
    })),
  };
};

/** Що робити з конкретним рядком файлу після зіставлення з базою. */
interface RowPlan<TData> {
  create: Array<{ name: string; data: TData }>;
  update: Array<{ id: string; name: string; data: TData }>;
  remove: Array<{ id: string; name: string }>;
  warnings: string[];
  /** Аркуша не було в книзі — розділ не чіпаємо і не показуємо в прев'ю. */
  absent?: boolean;
}

/**
 * Зіставляє рядки файлу з наявними документами: спершу за службовим `id`
 * (переживає перейменування), далі за назвою без урахування регістру.
 * Експортовано, щоб зіставлення можна було перевіряти без підключення до бази.
 */
export const planRows = <
  TDoc extends { _id: unknown; name: string },
  TRow extends { id?: string; name: string },
  TData extends Record<string, unknown>,
>(
  existing: TDoc[],
  rows: TRow[],
  toData: (row: TRow) => TData,
  isChanged: (doc: TDoc, data: TData) => boolean,
  /** Причина, чому рядок не можна записати (напр. порожня рекомендація). */
  rejectReason?: (data: TData) => string | null,
): RowPlan<TData> => {
  const byId = new Map(existing.map((doc) => [String(doc._id), doc]));
  const byName = new Map(existing.map((doc) => [normalizeName(doc.name), doc]));

  const plan: RowPlan<TData> = { create: [], update: [], remove: [], warnings: [] };
  const matched = new Set<string>();
  const seenNames = new Set<string>();
  const rejected: string[] = [];
  let rejectedReason = "";

  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;

    const key = normalizeName(name);
    if (seenNames.has(key)) {
      plan.warnings.push(`Дублікат у файлі: «${name}» — врахували перший рядок.`);
      continue;
    }
    seenNames.add(key);

    const data = toData(row);
    const doc =
      (isObjectId(row.id) ? byId.get(row.id!) : undefined) ?? byName.get(key);

    const reason = rejectReason?.(data) ?? null;
    if (reason) {
      // Рядок не записуємо, але наявний запис однаково вважаємо знайденим —
      // інакше галочка «видаляти зайве» знесла б його через ваду у файлі.
      if (doc) matched.add(String(doc._id));
      rejected.push(name);
      rejectedReason = reason;
      continue;
    }

    if (!doc) {
      plan.create.push({ name, data });
      continue;
    }

    matched.add(String(doc._id));
    if (isChanged(doc, data)) {
      plan.update.push({ id: String(doc._id), name, data });
    }
  }

  if (rejected.length > 0) {
    const shown = rejected.slice(0, 5).join(", ");
    const rest = rejected.length - Math.min(rejected.length, 5);
    plan.warnings.push(
      `Пропущено ${rejected.length} рядк(ів) — ${rejectedReason}: ${shown}${rest > 0 ? ` … ще ${rest}` : ""}.`,
    );
  }

  for (const doc of existing) {
    if (!matched.has(String(doc._id))) {
      plan.remove.push({ id: String(doc._id), name: doc.name });
    }
  }

  return plan;
};

const toSheet = (
  key: string,
  label: string,
  plan: RowPlan<Record<string, unknown>>,
): SheetPlan => ({
  key,
  label,
  create: plan.create.map((row) => row.name),
  update: plan.update.map((row) => row.name),
  remove: plan.remove.map((row) => row.name),
  warnings: plan.warnings,
});

interface NamedPlans {
  exams: RowPlan<Record<string, unknown>>;
  medications: RowPlan<Record<string, unknown>>;
  procedures: RowPlan<Record<string, unknown>>;
  specialists: RowPlan<Record<string, unknown>>;
  homeCares: RowPlan<Record<string, unknown>>;
  categories: RowPlan<Record<string, unknown>>;
  categoryItems: Array<{
    categoryId?: string;
    categoryName: string;
    plan: RowPlan<Record<string, unknown>>;
  }>;
}

const textChanged = (before: string | undefined, after: unknown): boolean =>
  (before ?? "").trim() !== String(after ?? "").trim();

export const buildImportPlan = async (
  data: ReferenceDump,
): Promise<{ plans: NamedPlans; plan: ImportPlan }> => {
  const [exams, medications, procedures, specialists, homeCares, categories, items] =
    await Promise.all([
      Exam.find(),
      Medication.find(),
      Procedure.find(),
      Specialist.find(),
      HomeCare.find(),
      Category.find(),
      CategoryItem.find(),
    ]);

  const nameAndRecommendation = (row: SyncItem) => ({
    name: row.name.trim(),
    recommendation: (row.recommendation ?? "").trim(),
  });

  const recommendationChanged = (
    doc: { name: string; recommendation?: string },
    next: { name: string; recommendation: string },
  ) =>
    textChanged(doc.name, next.name) ||
    textChanged(doc.recommendation, next.recommendation);

  // У схемах Exam/Medication/Procedure рекомендація обовʼязкова, тож рядок без
  // неї база просто не прийме. Замість падіння всього імпорту пропускаємо
  // такий рядок і кажемо про це в прев'ю — так само, як робить імпорт CSV.
  const requireRecommendation = (data: { recommendation: string }) =>
    data.recommendation ? null : "порожня рекомендація";

  /*
    Розділ, якого не було в книзі. Порожній план + `absent: true`, щоб аркуш
    не потрапив у прев'ю і жоден запис не пішов під видалення.
  */
  const absentSection = (): RowPlan<Record<string, unknown>> => ({
    create: [],
    update: [],
    remove: [],
    warnings: [],
    absent: true,
  });

  /** Планує розділ лише якщо відповідний аркуш був у книзі. */
  const planSection = <TDoc extends { _id: unknown; name: string }, TRow extends { id?: string; name: string }>(
    existing: TDoc[],
    rows: TRow[] | undefined,
    build: () => RowPlan<Record<string, unknown>>,
  ): RowPlan<Record<string, unknown>> => (rows ? build() : absentSection());

  const plans: NamedPlans = {
    exams: planSection(exams, data.exams, () =>
      planRows(
        exams,
        data.exams!,
        nameAndRecommendation,
        recommendationChanged,
        requireRecommendation,
      ),
    ),
    medications: planSection(medications, data.medications, () =>
      planRows(
        medications,
        data.medications!,
        nameAndRecommendation,
        recommendationChanged,
        requireRecommendation,
      ),
    ),
    procedures: planSection(procedures, data.procedures, () =>
      planRows(
        procedures,
        data.procedures!,
        nameAndRecommendation,
        recommendationChanged,
        requireRecommendation,
      ),
    ),
    specialists: planSection(specialists, data.specialists, () =>
      planRows(
        specialists,
        data.specialists!,
        (row: SyncItem) => ({ name: row.name.trim() }),
        (doc, next) => textChanged(doc.name, next.name),
      ),
    ),
    homeCares: planSection(homeCares, data.homeCares, () =>
      planRows(
        homeCares,
        data.homeCares!,
        (row: SyncHomeCare) => ({
          name: row.name.trim(),
          morning: Boolean(row.morning),
          evening: Boolean(row.evening),
        }),
        (doc, next) =>
          textChanged(doc.name, next.name) ||
          doc.morning !== next.morning ||
          doc.evening !== next.evening,
      ),
    ),
    categories: planSection(categories, data.categories, () =>
      planRows(
        categories,
        data.categories!,
        (row: SyncCategory) => ({
          name: row.name.trim(),
          showNameInReport: row.showNameInReport ?? true,
          reportPosition: CATEGORY_REPORT_POSITIONS.includes(
            row.reportPosition as CategoryReportPosition,
          )
            ? row.reportPosition
            : "after_homecare",
          importantNote: (row.importantNote ?? "").trim(),
        }),
        (doc, next) =>
          textChanged(doc.name, next.name) ||
          doc.showNameInReport !== next.showNameInReport ||
          doc.reportPosition !== next.reportPosition ||
          textChanged(doc.importantNote, next.importantNote),
      ),
    ),
    categoryItems: [],
  };

  for (const category of data.categories ?? []) {
    const existingCategory =
      (isObjectId(category.id)
        ? categories.find((doc) => String(doc._id) === category.id)
        : undefined) ??
      categories.find((doc) => normalizeName(doc.name) === normalizeName(category.name));

    const existingItems = existingCategory
      ? items.filter((item) => String(item.category) === String(existingCategory._id))
      : [];

    plans.categoryItems.push({
      categoryId: existingCategory ? String(existingCategory._id) : undefined,
      categoryName: category.name.trim(),
      // Категорія згадана в аркуші «Категорії», але власної вкладки не має —
      // її записи лишаються як є, а не вважаються видаленими.
      plan: category.items
        ? planRows(
            existingItems,
            category.items,
            nameAndRecommendation,
            (doc, next) =>
              textChanged(doc.name, next.name) ||
              textChanged(doc.recommendation, next.recommendation),
          )
        : absentSection(),
    });
  }

  // Записи категорій, які пропали разом зі своєю категорією.
  const fileCategoryIds = new Set(
    plans.categoryItems.map((entry) => entry.categoryId).filter(Boolean) as string[],
  );
  for (const category of plans.categories.remove) {
    if (fileCategoryIds.has(category.id)) continue;
    const orphaned = items.filter((item) => String(item.category) === category.id);
    if (orphaned.length > 0) {
      plans.categories.warnings.push(
        `Разом із категорією «${category.name}» буде видалено ${orphaned.length} запис(ів).`,
      );
    }
  }

  const allSheets: Array<SheetPlan & { absent?: boolean }> = [
    { ...toSheet("exams", "Обстеження", plans.exams), absent: plans.exams.absent },
    { ...toSheet("medications", "Засоби", plans.medications), absent: plans.medications.absent },
    { ...toSheet("procedures", "Процедури", plans.procedures), absent: plans.procedures.absent },
    { ...toSheet("specialists", "Спеціалісти", plans.specialists), absent: plans.specialists.absent },
    { ...toSheet("homeCares", "Домашній догляд", plans.homeCares), absent: plans.homeCares.absent },
    { ...toSheet("categories", "Категорії", plans.categories), absent: plans.categories.absent },
    ...plans.categoryItems.map((entry) => ({
      ...toSheet(
        `category:${entry.categoryId ?? "new"}:${entry.categoryName}`,
        entry.categoryId
          ? entry.categoryName
          : `${entry.categoryName} (нова категорія)`,
        entry.plan,
      ),
      absent: entry.plan.absent,
    })),
  ];

  // Розділи, яких у книзі не було, показуємо окремим рядком — щоб адмін бачив,
  // що вони лишаються недоторканими, а не мовчки зникають із прев'ю.
  const missingSections = allSheets
    .filter((sheet) => sheet.absent)
    .map((sheet) => sheet.label);

  const sheets: SheetPlan[] = allSheets
    .filter((sheet) => !sheet.absent)
    .map(({ absent: _absent, ...sheet }) => sheet);

  const totals = sheets.reduce(
    (acc, sheet) => ({
      create: acc.create + sheet.create.length,
      update: acc.update + sheet.update.length,
      remove: acc.remove + sheet.remove.length,
    }),
    { create: 0, update: 0, remove: 0 },
  );

  return { plans, plan: { sheets, totals, missingSections } };
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const applyRowPlan = async (
  model: Model<any>,
  plan: RowPlan<Record<string, unknown>>,
  removeMissing: boolean,
  session?: mongoose.ClientSession,
  extraOnCreate?: Record<string, unknown>,
) => {
  const ops: any[] = [];

  // Порядок навмисний: назви мають unique-індекс, тож спершу звільняємо їх
  // видаленням, потім оновлюємо, і лише в кінці вставляємо нові.
  if (removeMissing) {
    for (const row of plan.remove) {
      ops.push({ deleteOne: { filter: { _id: row.id } } });
    }
  }
  for (const row of plan.update) {
    ops.push({ updateOne: { filter: { _id: row.id }, update: { $set: row.data } } });
  }
  for (const row of plan.create) {
    ops.push({ insertOne: { document: { ...row.data, ...extraOnCreate } } });
  }

  if (ops.length === 0) return;
  await model.bulkWrite(ops, session ? { session } : {});
};

const applyPlans = async (
  plans: NamedPlans,
  removeMissing: boolean,
  session?: mongoose.ClientSession,
) => {
  await applyRowPlan(Exam, plans.exams, removeMissing, session);
  await applyRowPlan(Medication, plans.medications, removeMissing, session);
  await applyRowPlan(Procedure, plans.procedures, removeMissing, session);
  await applyRowPlan(Specialist, plans.specialists, removeMissing, session);

  // order у домашньому догляді керується перетягуванням в UI, тож новим
  // записам дописуємо його в кінець і не чіпаємо в наявних.
  const lastHomeCare = await HomeCare.findOne().sort({ order: -1 }).session(session ?? null);
  let nextOrder = typeof lastHomeCare?.order === "number" ? lastHomeCare.order + 1 : 0;
  for (const row of plans.homeCares.create) {
    row.data.order = nextOrder;
    nextOrder += 1;
  }
  await applyRowPlan(HomeCare, plans.homeCares, removeMissing, session);

  if (removeMissing) {
    for (const category of plans.categories.remove) {
      await CategoryItem.deleteMany({ category: category.id }, session ? { session } : {});
    }
  }
  await applyRowPlan(Category, plans.categories, removeMissing, session);

  for (const entry of plans.categoryItems) {
    let categoryId = entry.categoryId;

    if (!categoryId) {
      const created = await Category.findOne({ name: entry.categoryName }).session(
        session ?? null,
      );
      categoryId = created ? String(created._id) : undefined;
    }
    if (!categoryId) continue;

    await applyRowPlan(CategoryItem, entry.plan, removeMissing, session, {
      category: new mongoose.Types.ObjectId(categoryId),
    });
  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface ImportResult extends ImportPlan {
  transactional: boolean;
}

/**
 * Застосовує імпорт. План рахується тут же, на актуальному стані бази —
 * клієнт передає тільки вміст файлу.
 */
export const applyImport = async (
  data: ReferenceDump,
  removeMissing: boolean,
): Promise<ImportResult> => {
  const { plans, plan } = await buildImportPlan(data);

  let transactional = true;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await applyPlans(plans, removeMissing, session);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const unsupported =
      message.includes("Transaction numbers") ||
      message.includes("replica set") ||
      message.includes("not supported");

    if (!unsupported) throw err;

    // Standalone-mongod без replica set транзакцій не вміє. Виконуємо без
    // них, але кажемо про це у відповіді — адмін має знати, що відкату немає.
    transactional = false;
    await applyPlans(plans, removeMissing);
  } finally {
    await session.endSession();
  }

  await ActivityLog.create({
    action: "reference-import",
    meta: { ...plan.totals, removeMissing, transactional },
  });

  return { ...plan, transactional };
};
