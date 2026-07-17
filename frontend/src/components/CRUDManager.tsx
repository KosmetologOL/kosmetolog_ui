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

  const colSpan =
    (hasRecommendation ? 2 : 1) +
    (hasMorningEvening ? 2 : 0) +
    (showActions ? 1 : 0);

  return (
    <div className="flex flex-col items-start justify-start">
      <div className="mb-3 flex w-full flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-green-700">{title}</h2>

        {enableCsvImportExport && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-md border border-green-300 px-3 py-2 text-sm font-medium text-green-700 transition-all hover:bg-green-50 active:scale-95"
            >
              Експортувати в CSV
            </button>

            {editable && (
              <>
                <button
                  type="button"
                  onClick={handleImportClick}
                  disabled={isImporting}
                  className="rounded-md border border-green-300 px-3 py-2 text-sm font-medium text-green-700 transition-all hover:bg-green-50 active:scale-95 disabled:opacity-50"
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
        className="mb-4 w-full max-w-md rounded-md border border-green-300 px-3 py-2"
      />

      {editable && (
        <div className="mb-4 flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center">
          <input
            placeholder="Назва"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="min-h-[38px] flex-1 rounded-md border border-green-300 px-2 py-[9px]"
          />

          {hasRecommendation && (
            <textarea
              ref={textRef}
              placeholder="Рекомендація"
              value={form.recommendation}
              onChange={(e) =>
                setForm({ ...form, recommendation: e.target.value })
              }
              className="min-h-[38px] flex-1 resize-none overflow-hidden rounded-md border border-green-300 px-2 py-[9px] leading-[1.4]"
            />
          )}

          {hasMorningEvening && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={form.morning}
                  onChange={(e) =>
                    setForm({ ...form, morning: e.target.checked })
                  }
                  className="accent-green-600"
                />
                Ранок
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={form.evening}
                  onChange={(e) =>
                    setForm({ ...form, evening: e.target.checked })
                  }
                  className="accent-green-600"
                />
                Вечір
              </label>
            </div>
          )}

          <button
            onClick={handleSave}
            className={`h-[38px] rounded-md px-4 py-2 text-white font-medium transition-all active:scale-95 ${
              editingId
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
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
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 font-medium transition-all hover:bg-gray-50 active:scale-95"
            >
              Скасувати
            </button>
          )}
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-green-300 bg-green-50">
              <th className="border border-green-200 px-4 py-2 text-left font-semibold text-green-700">
                Назва
              </th>
              {hasRecommendation && (
                <th className="border border-green-200 px-4 py-2 text-left font-semibold text-green-700">
                  Рекомендація
                </th>
              )}
              {hasMorningEvening && (
                <>
                  <th className="border border-green-200 px-4 py-2 text-center font-semibold text-green-700">
                    Ранок
                  </th>
                  <th className="border border-green-200 px-4 py-2 text-center font-semibold text-green-700">
                    Вечір
                  </th>
                </>
              )}
              {showActions && (
                <th className="border border-green-200 px-4 py-2 text-center font-semibold text-green-700 w-32">
                  Дії
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="border border-green-200 px-4 py-3 text-center text-gray-500"
                >
                  Немає елементів
                </td>
              </tr>
            ) : (
              filteredList.map((item) => (
                <tr
                  key={item._id}
                  className="border-b border-green-200 hover:bg-green-50"
                >
                  <td className="border border-green-200 px-4 py-2 text-green-900">
                    {item.name}
                  </td>
                  {hasRecommendation && (
                    <td className="border border-green-200 px-4 py-2 text-gray-700 whitespace-pre-wrap text-sm max-w-md">
                      {item.recommendation || "-"}
                    </td>
                  )}
                  {hasMorningEvening && (
                    <>
                      <td className="border border-green-200 px-4 py-2 text-center text-green-900">
                        {item.morning ? "✓" : "–"}
                      </td>
                      <td className="border border-green-200 px-4 py-2 text-center text-green-900">
                        {item.evening ? "✓" : "–"}
                      </td>
                    </>
                  )}
                  {showActions && (
                    <td className="border border-green-200 px-4 py-2 text-center">
                      <div className="flex gap-2 justify-center">
                        {editable && (
                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded bg-amber-500 px-3 py-1 text-white text-sm font-medium transition-all hover:bg-amber-600 active:scale-95"
                          >
                            Редагувати
                          </button>
                        )}
                        {deletable && (
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="rounded bg-red-600 px-3 py-1 text-white text-sm font-medium transition-all hover:bg-red-700 active:scale-95"
                          >
                            Видалити
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CRUDManager;
