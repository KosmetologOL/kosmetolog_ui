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
  const textRef = useRef<HTMLTextAreaElement | null>(null);

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

  const colSpan =
    (hasRecommendation ? 2 : 1) +
    (hasMorningEvening ? 2 : 0) +
    (showActions ? 1 : 0);

  return (
    <div className="flex flex-col items-start justify-start">
      <h2 className="mb-3 text-lg font-semibold text-green-700">{title}</h2>

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
            className={`h-[38px] rounded-md px-3 text-white ${
              editingId
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {editingId ? "Оновити" : "Додати"}
          </button>
        </div>
      )}

      <table className="w-full table-fixed border border-green-200 text-sm">
        <thead className="bg-green-100">
          <tr>
            <th className="px-2 py-1 text-left break-words">Назва</th>
            {hasRecommendation && (
              <th className="px-2 py-1 text-left break-words">Рекомендація</th>
            )}
            {hasMorningEvening && (
              <>
                <th className="px-2 py-1 text-center">Ранок</th>
                <th className="px-2 py-1 text-center">Вечір</th>
              </>
            )}
            {showActions && <th className="px-2 py-1 text-center">Дії</th>}
          </tr>
        </thead>
        <tbody>
          {filteredList.map((item) => (
            <tr key={item._id} className="border-b border-green-100">
              <td className="px-2 py-1 break-words">{item.name}</td>
              {hasRecommendation && (
                <td className="whitespace-pre-wrap break-words px-2 py-1 text-gray-700">
                  {item.recommendation}
                </td>
              )}
              {hasMorningEvening && (
                <>
                  <td className="text-center">{item.morning ? "✓" : "–"}</td>
                  <td className="text-center">{item.evening ? "✓" : "–"}</td>
                </>
              )}
              {showActions && (
                <td className="px-2 py-1 text-center">
                  {editable && (
                    <button
                      onClick={() => handleEdit(item)}
                      className="mr-3 text-blue-600 hover:underline"
                    >
                      Редагувати
                    </button>
                  )}
                  {deletable && (
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="text-red-600 hover:underline"
                    >
                      Видалити
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}

          {filteredList.length === 0 && (
            <tr>
              <td
                colSpan={colSpan}
                className="px-2 py-4 text-center text-gray-500"
              >
                Нічого не знайдено
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CRUDManager;
