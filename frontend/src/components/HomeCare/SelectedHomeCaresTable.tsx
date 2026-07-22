import type { IHomeCare } from "#api/homeCaresApi";
import FormattedText from "#components/FormattedText";
import ReferenceItemModal from "#components/ReferenceItemModal";
import React, { useState } from "react";

interface Props {
  selectedHomeCares: IHomeCare[];
  setSelectedHomeCares: React.Dispatch<React.SetStateAction<IHomeCare[]>>;
}

const SelectedHomeCaresTable: React.FC<Props> = ({
  selectedHomeCares,
  setSelectedHomeCares,
}) => {
  const [editingHomeCare, setEditingHomeCare] = useState<IHomeCare | null>(
    null,
  );

  const handleRemove = (id?: string) => {
    setSelectedHomeCares((prev) => prev.filter((h) => h._id !== id));
  };

  const toggle = (index: number, key: keyof IHomeCare) => {
    setSelectedHomeCares((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [key]: !h[key] } : h)),
    );
  };

  const handleSave = (updatedHomeCare: {
    name: string;
    recommendation?: string;
  }) => {
    if (!editingHomeCare?._id) {
      return;
    }

    setSelectedHomeCares((prev) =>
      prev.map((item) =>
        item._id === editingHomeCare._id
          ? {
              ...item,
              medicationName: updatedHomeCare.name,
              recommendations: updatedHomeCare.recommendation ?? "",
            }
          : item,
      ),
    );

    setEditingHomeCare(null);
  };

  if (selectedHomeCares.length === 0) {
    return (
      <p className="text-green-700 text-sm mb-2 mt-3">Нічого не вибрано</p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto mb-3 mt-3">
        <table className="min-w-full border border-green-200 rounded-md text-sm">
          <thead className="bg-green-100">
            <tr>
              <th className="px-2 py-1 text-left">Назва</th>
              <th className="px-2 py-1 text-left">Засіб</th>
              <th className="px-2 py-1 text-left">Рекомендації</th>
              <th className="px-2 py-1 text-center">Ранок</th>
              <th className="px-2 py-1 text-center">Вечір</th>
              <th className="px-2 py-1 text-center">Дії</th>
            </tr>
          </thead>

          <tbody>
            {selectedHomeCares.map((h, i) => (
              <tr
                key={h._id || i}
                className="border-b border-green-200 hover:bg-green-50"
              >
                <td className="px-2 py-1">{h.name}</td>

                <td className="px-2 py-1 text-left text-gray-700">
                  {h.medicationName && h.medicationName !== ""
                    ? h.medicationName
                    : "—"}
                </td>

                <td className="max-w-[240px] px-2 py-1 text-gray-700">
                  <FormattedText
                    markdown={h.recommendations}
                    fallback="Немає тексту"
                    className="line-clamp-2 text-sm"
                  />
                </td>

                {(["morning", "evening"] as (keyof IHomeCare)[]).map((key) => (
                  <td key={key} className="text-center p-1">
                    <input
                      type="checkbox"
                      checked={!!h[key]}
                      onChange={() => toggle(i, key)}
                      className="accent-blue-600 cursor-pointer"
                    />
                  </td>
                ))}

                <td className="px-2 py-1 text-center whitespace-nowrap">
                  <button
                    type="button"
                    className="text-blue-600 hover:underline mr-2"
                    onClick={() => setEditingHomeCare(h)}
                  >
                    Оновити
                  </button>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => handleRemove(h._id)}
                  >
                    Видалити
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReferenceItemModal
        visible={Boolean(editingHomeCare)}
        title="Редагувати засіб"
        submitLabel="Зберегти"
        recommendationLabel="Рекомендації"
        item={{
          name: editingHomeCare?.medicationName ?? "",
          recommendation: editingHomeCare?.recommendations ?? "",
        }}
        onClose={() => setEditingHomeCare(null)}
        onSave={handleSave}
      />
    </>
  );
};

export default SelectedHomeCaresTable;
