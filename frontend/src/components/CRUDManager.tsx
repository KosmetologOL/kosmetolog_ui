import axios from "axios";
import { useEffect, useRef, useState } from "react";

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
  mapItem?: (item: T) => CRUDItem;
  mapToApi?: (item: CRUDItem) => any;
}

const CRUDManager = <T,>({
  title,
  apiPath,
  hasRecommendation,
  hasMorningEvening,
  mapItem,
  mapToApi,
}: Props<T>) => {
  const [list, setList] = useState<CRUDItem[]>([]);
  const [form, setForm] = useState<CRUDItem>({
    name: "",
    recommendation: "",
    morning: false,
    evening: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  const fetchList = async () => {
    const { data } = await axios.get<T[]>(
      `${import.meta.env.VITE_API_URL}/${apiPath}`,
    );

    let raw = data;

    if (!Array.isArray(raw)) {
      const foundArray = Object.values(raw).find((v) => Array.isArray(v));
      if (foundArray) raw = foundArray;
    }

    const finalList = mapItem ? (raw as T[]).map(mapItem) : (raw as CRUDItem[]);
    console.log("RAW DATA:", data);

    setList(finalList);
  };

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = "auto";
      textRef.current.style.height = textRef.current.scrollHeight + "px";
    }
  }, [form.recommendation]);

  const handleSave = async () => {
    if (!form.name.trim()) return;

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
    fetchList();
  };

  const handleDelete = async (id?: string) => {
    if (!confirm("Ви впевнені, що хочете видалити цей елемент?")) return;
    if (!id) return;
    await axios.delete(`${import.meta.env.VITE_API_URL}/${apiPath}/${id}`);
    fetchList();
  };

  const handleEdit = (item: CRUDItem) => {
    setEditingId(item._id || null);
    setForm(item);
  };

  return (
    <div className="flex flex-col items-start justify-start">
      <h2 className="text-lg font-semibold mb-3 text-green-700">{title}</h2>

      <div className="flex flex-col sm:flex-row gap-2 mb-4 items-start sm:items-center w-full">
        <input
          placeholder="Назва"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border border-green-300 rounded-md px-2 py-[9px] flex-1 min-h-[38px]"
        />

        {hasRecommendation && (
          <textarea
            ref={textRef}
            placeholder="Рекомендація"
            value={form.recommendation}
            onChange={(e) =>
              setForm({ ...form, recommendation: e.target.value })
            }
            className="border border-green-300 rounded-md px-2 py-[9px] flex-1 resize-none overflow-hidden min-h-[38px] leading-[1.4]"
          />
        )}

        {hasMorningEvening && (
          <div className="flex gap-3 items-center">
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
          className={`${
            editingId
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-green-600 hover:bg-green-700"
          } text-white px-3 rounded-md h-[38px]`}
        >
          {editingId ? "Оновити" : "Додати"}
        </button>
      </div>

      <table className="min-w-full border border-green-200 text-sm">
        <thead className="bg-green-100">
          <tr>
            <th className="px-2 py-1 text-left">Назва</th>
            {hasRecommendation && (
              <th className="px-2 py-1 text-left">Рекомендація</th>
            )}
            {hasMorningEvening && (
              <>
                <th className="px-2 py-1 text-center">Ранок</th>
                <th className="px-2 py-1 text-center">Вечір</th>
              </>
            )}
            <th className="px-2 py-1 text-center">Дії</th>
          </tr>
        </thead>
        <tbody>
          {list.map((item) => (
            <tr key={item._id} className="border-b border-green-100">
              <td className="px-2 py-1">{item.name}</td>
              {hasRecommendation && (
                <td className="px-2 py-1 text-gray-700 whitespace-pre-wrap">
                  {item.recommendation}
                </td>
              )}
              {hasMorningEvening && (
                <>
                  <td className="text-center">{item.morning ? "✓" : "–"}</td>
                  <td className="text-center">{item.evening ? "✓" : "–"}</td>
                </>
              )}
              <td className="px-2 py-1 text-center">
                <button
                  onClick={() => handleEdit(item)}
                  className="text-blue-600 hover:underline mr-3"
                >
                  Редагувати
                </button>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="text-red-600 hover:underline"
                >
                  Видалити
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CRUDManager;
