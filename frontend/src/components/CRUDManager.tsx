import { downloadCsv, parseCsv, toCsv } from "#types/csv";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

interface CRUDItem {
  _id?: string;
  name: string;
  recommendation?: string;
  morning?: boolean;
  evening?: boolean;
}

interface Props<T> {
  title: string;
  apiPath: string;
  hasRecommendation?: boolean;
  hasMorningEvening?: boolean;
  readOnly?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  enableCsvImportExport?: boolean;
  mapItem?: (item: T) => CRUDItem;
  mapToApi?: (item: CRUDItem) => unknown;
}

const CRUDManager = <T,>({
  title,
  apiPath,
  hasRecommendation,
  hasMorningEvening,
  readOnly = false,
  canEdit,
  canDelete,
  enableCsvImportExport = false,
  mapItem,
  mapToApi,
}: Props<T>) => {
  const editable = canEdit ?? !readOnly;
  const deletable = canDelete ?? !readOnly;
  const showActions = editable || deletable;
  const [list, setList] = useState<CRUDItem[]>([]);
  const [form, setForm] = useState<CRUDItem>({
    name: "",
    recommendation: "",
    morning: false,
    evening: false,
  });
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredList = list.filter((item) => {
    if (!normalizedSearch) {
      return true;
    }

    return [item.name, item.recommendation]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedSearch));
  });

  const fetchList = useCallback(async () => {
    const { data } = await axios.get<T[]>(
      `${import.meta.env.VITE_API_URL}/${apiPath}`,
    );

    let raw = data;

    if (!Array.isArray(raw)) {
      const foundArray = Object.values(raw).find((value) =>
        Array.isArray(value),
      );
      if (foundArray) {
        raw = foundArray as T[];
      }
    }

    setList(mapItem ? (raw as T[]).map(mapItem) : (raw as CRUDItem[]));
  }, [apiPath, mapItem]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    const handler = () => {
      void fetchList();
    };
    window.addEventListener("categoriesUpdated", handler as EventListener);
    return () =>
      window.removeEventListener("categoriesUpdated", handler as EventListener);
  }, [fetchList]);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = "auto";
      textRef.current.style.height = `${textRef.current.scrollHeight}px`;
    }
  }, [form.recommendation]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      return;
    }

    const payload = mapToApi ? mapToApi(form) : form;

    if (editingId) {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/${apiPath}/${editingId}`,
        payload,
      );
      setEditingId(null);
    } else {
      await axios.post(`${import.meta.env.VITE_API_URL}/${apiPath}`, payload);
    }

    setForm({ name: "", recommendation: "", morning: false, evening: false });
    void fetchList();
  };

  const handleDelete = async (id?: string) => {
    if (
      !id ||
      !window.confirm("Ви впевнені, що хочете видалити цей елемент?")
    ) {
      return;
    }

    await axios.delete(`${import.meta.env.VITE_API_URL}/${apiPath}/${id}`);
    void fetchList();
  };

  const handleEdit = (item: CRUDItem) => {
    setEditingId(item._id || null);
    setForm(item);
  };

  const handleExportCsv = () => {
    const header = hasRecommendation ? ["Назва", "Рекомендація"] : ["Назва"];
    const rows = list.map((item) =>
      hasRecommendation
        ? [item.name, item.recommendation ?? ""]
        : [item.name],
    );
    downloadCsv(`${apiPath}.csv`, toCsv(header, rows));
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const rawText = await file.text();
    const text =
      rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
    const rows = parseCsv(text);

    if (rows.length < 2) {
      window.alert("Файл порожній або не містить рядків з даними.");
      return;
    }

    const [header, ...dataRows] = rows;
    const nameIdx = header.findIndex(
      (h) => h.trim().toLowerCase() === "назва",
    );
    const recIdx = header.findIndex(
      (h) => h.trim().toLowerCase() === "рекомендація",
    );

    if (nameIdx === -1) {
      window.alert('У файлі немає колонки "Назва".');
      return;
    }

    const parsed = dataRows
      .map((cols) => ({
        name: (cols[nameIdx] ?? "").trim(),
        recommendation: recIdx >= 0 ? (cols[recIdx] ?? "").trim() : "",
      }))
      .filter((row) => row.name);

    if (parsed.length === 0) {
      window.alert("У файлі немає рядків із заповненою назвою.");
      return;
    }

    if (
      !window.confirm(
        `Імпортувати ${parsed.length} записів? Записи з існуючою назвою будуть оновлені, решта — додані.`,
      )
    ) {
      return;
    }

    setIsImporting(true);
    try {
      for (const row of parsed) {
        const existing = list.find(
          (item) => item.name.trim().toLowerCase() === row.name.toLowerCase(),
        );
        const payload = hasRecommendation
          ? { name: row.name, recommendation: row.recommendation }
          : { name: row.name };

        if (existing?._id) {
          await axios.put(
            `${import.meta.env.VITE_API_URL}/${apiPath}/${existing._id}`,
            payload,
          );
        } else {
          await axios.post(`${import.meta.env.VITE_API_URL}/${apiPath}`, payload);
        }
      }
      await fetchList();
      window.alert("Імпорт завершено.");
    } catch {
      window.alert(
        "Під час імпорту сталася помилка. Частина записів могла не оновитися.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-start">
      <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-3">
        <p className="section-label mb-0">{title}</p>

        {enableCsvImportExport && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="btn btn-ghost btn-sm"
            >
              Експортувати в CSV
            </button>

            {editable && (
              <>
                <button
                  type="button"
                  onClick={handleImportClick}
                  disabled={isImporting}
                  className="btn btn-ghost btn-sm"
                >
                  {isImporting ? "Імпортування..." : "Імпортувати з CSV"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </>
            )}
          </div>
        )}
      </div>

      <input
        placeholder="Пошук"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="field-input mb-4 max-w-md"
      />

      {editable && (
        <div className="ref-add-row mb-5 flex w-full flex-wrap items-start gap-3">
          <input
            placeholder="Назва"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="field-input min-w-[200px] flex-1"
          />

          {hasRecommendation && (
            <textarea
              ref={textRef}
              placeholder="Рекомендація"
              value={form.recommendation}
              onChange={(e) =>
                setForm({ ...form, recommendation: e.target.value })
              }
              rows={1}
              className="field-textarea min-w-[200px] flex-1 h-12 resize-none overflow-hidden"
            />
          )}

          {hasMorningEvening && (
            <div className="flex items-center gap-3.5 text-sm text-ink-soft">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.morning}
                  onChange={(e) =>
                    setForm({ ...form, morning: e.target.checked })
                  }
                />
                Ранок
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.evening}
                  onChange={(e) =>
                    setForm({ ...form, evening: e.target.checked })
                  }
                />
                Вечір
              </label>
            </div>
          )}

          <button onClick={handleSave} className="btn btn-primary">
            {editingId ? "Оновити" : "Додати"}
          </button>

          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setForm({
                  name: "",
                  recommendation: "",
                  morning: false,
                  evening: false,
                });
              }}
              className="btn btn-ghost"
            >
              Скасувати
            </button>
          )}
        </div>
      )}

      {filteredList.length === 0 ? (
        <p className="w-full py-8 text-center text-ink-soft">
          Немає елементів
        </p>
      ) : (
        <div className="ref-list flex w-full flex-col gap-2.5">
          {filteredList.map((item) => (
            <div key={item._id} className="list-row">
              <div className="min-w-0">
                <div className="list-row-name">{item.name}</div>
                {hasRecommendation && item.recommendation && (
                  <div className="list-row-sub whitespace-pre-wrap">
                    {item.recommendation}
                  </div>
                )}
                {hasMorningEvening && (
                  <div className="mt-2 flex gap-1.5">
                    <span className={`pill ${item.morning ? "is-on" : ""}`}>
                      Ранок
                    </span>
                    <span className={`pill ${item.evening ? "is-on" : ""}`}>
                      Вечір
                    </span>
                  </div>
                )}
              </div>
              {showActions && (
                <div className="list-row-actions">
                  {editable && (
                    <button
                      onClick={() => handleEdit(item)}
                      className="btn btn-ghost btn-sm"
                    >
                      Редагувати
                    </button>
                  )}
                  {deletable && (
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="btn btn-ghost btn-sm text-danger"
                    >
                      Видалити
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CRUDManager;
