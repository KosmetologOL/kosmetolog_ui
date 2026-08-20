import {
  applyReferenceImport,
  exportReferences,
  previewReferenceImport,
  type ImportPlan,
  type ReferenceDump,
  type SheetPlan,
} from "#api/referenceSyncApi";
import ConfirmModal from "#components/ConfirmModal";
import Spinner from "#components/Spinner";
import {
  buildReferenceWorkbook,
  downloadWorkbook,
  parseReferenceWorkbook,
} from "#lib/referenceWorkbook";
import { plural } from "#lib/plural";
import React, { useRef, useState } from "react";
import toast from "react-hot-toast";

/*
  Масовий імпорт/експорт довідників однією книгою XLSX.

  Імпорт навмисно двокроковий: спочатку сервер рахує план змін і показує його
  тут, і лише після підтвердження застосовує. Бекапу бази немає, тож мовчазна
  заміна «як у файлі» неприпустима.
*/

const MAX_NAMES_SHOWN = 40;

const fileNameForToday = (): string => {
  const today = new Date().toISOString().slice(0, 10);
  return `Довідники ${today}.xlsx`;
};

const NameList: React.FC<{ label: string; names: string[] }> = ({
  label,
  names,
}) => {
  if (names.length === 0) return null;

  const shown = names.slice(0, MAX_NAMES_SHOWN);
  const rest = names.length - shown.length;

  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-[13px] text-ink-soft">
        {label}: {names.length}
      </summary>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
        {shown.join(", ")}
        {rest > 0 ? ` … ще ${rest}` : ""}
      </p>
    </details>
  );
};

const SheetRow: React.FC<{ sheet: SheetPlan }> = ({ sheet }) => {
  const isUnchanged =
    sheet.create.length === 0 &&
    sheet.update.length === 0 &&
    sheet.remove.length === 0;

  return (
    <div className="list-row flex-col items-start gap-1">
      <div className="flex w-full flex-wrap items-center gap-2">
        <span className="list-row-name">{sheet.label}</span>
        {isUnchanged ? (
          <span className="text-[13px] text-ink-soft">без змін</span>
        ) : (
          <span className="flex flex-wrap gap-1.5">
            {sheet.create.length > 0 && (
              <span className="pill">+{sheet.create.length}</span>
            )}
            {sheet.update.length > 0 && (
              <span className="pill">змінити {sheet.update.length}</span>
            )}
            {sheet.remove.length > 0 && (
              <span className="pill is-danger">
                видалити {sheet.remove.length}
              </span>
            )}
          </span>
        )}
      </div>

      <NameList label="Додати" names={sheet.create} />
      <NameList label="Змінити" names={sheet.update} />
      <NameList label="Видалити" names={sheet.remove} />

      {sheet.warnings.map((warning) => (
        <p key={warning} className="text-[13px] text-danger">
          {warning}
        </p>
      ))}
    </div>
  );
};

const ReferenceImportExport: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [pendingDump, setPendingDump] = useState<ReferenceDump | null>(null);
  const [removeMissing, setRemoveMissing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetImport = () => {
    setPlan(null);
    setPendingDump(null);
    setRemoveMissing(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const dump = await exportReferences();
      const blob = await buildReferenceWorkbook(dump);
      downloadWorkbook(fileNameForToday(), blob);
      toast.success("Книгу довідників збережено.");
    } catch {
      toast.error("Не вдалося вивантажити довідники. Спробуйте ще раз.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsPreparing(true);
    resetImport();
    try {
      const { dump, ignoredSheets } = await parseReferenceWorkbook(file);
      const nextPlan = await previewReferenceImport(dump);

      setPendingDump(dump);
      setPlan(nextPlan);

      if (ignoredSheets.length > 0) {
        toast(`Пропущено аркуші без даних: ${ignoredSheets.join(", ")}.`, {
          icon: "⚠️",
        });
      }
    } catch {
      toast.error(
        "Не вдалося прочитати книгу. Перевірте, що це файл .xlsx з тими самими колонками, що й в експорті.",
      );
    } finally {
      setIsPreparing(false);
    }
  };

  const handleApply = async () => {
    if (!pendingDump) return;

    setIsApplying(true);
    try {
      const result = await applyReferenceImport(pendingDump, removeMissing);
      setIsConfirmOpen(false);
      resetImport();

      // Категорії могли зʼявитись або зникнути — оновлюємо решту панелей.
      window.dispatchEvent(new Event("categoriesUpdated"));

      toast.success(
        `Імпорт завершено: додано ${result.totals.create}, змінено ${result.totals.update}` +
          (removeMissing ? `, видалено ${result.totals.remove}` : "") +
          ".",
      );

      if (!result.transactional) {
        toast(
          "База не підтримує транзакції — зміни застосовано без можливості автоматичного відкату.",
          { icon: "⚠️" },
        );
      }
    } catch {
      toast.error("Не вдалося застосувати імпорт. Довідники не змінено.");
    } finally {
      setIsApplying(false);
    }
  };

  const totals = plan?.totals;
  const hasChanges =
    Boolean(totals) &&
    (totals!.create > 0 || totals!.update > 0 || (removeMissing && totals!.remove > 0));

  return (
    <div>
      <p className="panel-title mb-1">Імпорт та експорт довідників</p>
      <p className="sub-label mb-4">
        Одна книга .xlsx: окремий аркуш на кожен довідник і на кожну категорію.
        Редагуйте у Google Таблицях чи Excel і завантажуйте назад.
      </p>

      <div className="mb-5 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="btn btn-primary"
        >
          {isExporting ? (
            <>
              <Spinner />
              Готуємо…
            </>
          ) : (
            "Експортувати все"
          )}
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPreparing}
          className="btn btn-tint"
        >
          {isPreparing ? (
            <>
              <Spinner />
              Читаємо файл…
            </>
          ) : (
            "Завантажити книгу"
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {plan && (
        <div className="anim-rise">
          <p className="panel-title mb-1">Що зміниться</p>
          <p className="sub-label mb-3">
            Додати {plan.totals.create} · змінити {plan.totals.update} · зайвих
            у базі {plan.totals.remove}
          </p>

          {plan.missingSections.length > 0 && (
            <p className="mb-3 text-[13px] text-ink-soft">
              У книзі немає аркушів: {plan.missingSections.join(", ")}. Ці
              розділи лишаються без змін — навіть із галочкою видалення.
            </p>
          )}

          <div className="mb-4 flex flex-col gap-1.5">
            {plan.sheets.map((sheet) => (
              <SheetRow key={sheet.key} sheet={sheet} />
            ))}
          </div>

          <label className="mb-4 flex items-start gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={removeMissing}
              onChange={(e) => setRemoveMissing(e.target.checked)}
              className="mt-1"
            />
            <span>
              Видаляти записи, яких немає у файлі ({plan.totals.remove}{" "}
              {plural(plan.totals.remove, ["запис", "записи", "записів"])}).
              Без цієї галочки імпорт лише додає й оновлює.
            </span>
          </label>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={!hasChanges}
              className="btn btn-primary"
            >
              Застосувати
            </button>
            <button type="button" onClick={resetImport} className="btn btn-ghost">
              Скасувати
            </button>
          </div>

          {!hasChanges && (
            <p className="mt-2 text-[13px] text-ink-soft">
              Змін немає — файл збігається з базою.
            </p>
          )}
        </div>
      )}

      <ConfirmModal
        visible={isConfirmOpen}
        title="Застосувати імпорт?"
        message={
          removeMissing
            ? `Буде додано ${plan?.totals.create ?? 0}, змінено ${plan?.totals.update ?? 0} і видалено ${plan?.totals.remove ?? 0} записів. Видалення скасувати неможливо.`
            : `Буде додано ${plan?.totals.create ?? 0} і змінено ${plan?.totals.update ?? 0} записів. Нічого не видаляється.`
        }
        confirmLabel="Застосувати"
        loadingLabel="Застосовуємо…"
        isLoading={isApplying}
        onConfirm={handleApply}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};

export default ReferenceImportExport;
