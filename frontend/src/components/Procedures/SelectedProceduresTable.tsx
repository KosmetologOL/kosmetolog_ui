import type { IProcedure } from "#api/proceduresApi";
import ExpandableText from "#components/ExpandableText";
import React, { useState } from "react";

interface Props {
  selectedProcedures: IProcedure[];
  setSelectedProcedures: React.Dispatch<React.SetStateAction<IProcedure[]>>;
}

const SelectedProceduresTable: React.FC<Props> = ({
  selectedProcedures,
  setSelectedProcedures,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = (procedure: IProcedure) => {
    setEditingId(procedure._id || null);
  };

  const handleInputChange = (
    id: string,
    field: "name" | "recommendation",
    value: string
  ) => {
    setSelectedProcedures((prev) =>
      prev.map((p) =>
        p._id === id
          ? {
              ...p,
              [field]: value,
            }
          : p
      )
    );
  };

  const handleFinishEdit = () => {
    setEditingId(null);
  };

  const handleRemove = (id: string) => {
    setSelectedProcedures((prev) => prev.filter((p) => p._id !== id));
  };

  if (selectedProcedures.length === 0)
    return (
      <p className="text-green-700 text-sm mb-2 mt-3">Нічого не вибрано</p>
    );

  return (
    <div className="overflow-x-auto mb-3 mt-3 ">
      <table className="min-w-full border border-green-200 rounded-md text-sm">
        <thead className="bg-green-100">
          <tr>
            <th className="px-2 py-1 text-left">Назва процедури</th>
            <th className="px-2 py-1 text-left">Рекомендація</th>
            <th className="px-2 py-1 text-left">Дії</th>
          </tr>
        </thead>
        <tbody>
          {selectedProcedures.map((procedure) => (
            <tr
              key={procedure._id}
              className="border-b border-green-200 hover:bg-green-50"
            >
              <td className="px-2 py-1">
                {editingId === procedure._id ? (
                  <input
                    type="text"
                    value={procedure.name || ""}
                    onChange={(e) =>
                      handleInputChange(procedure._id!, "name", e.target.value)
                    }
                    className="w-full border border-green-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-300"
                  />
                ) : (
                  <span
                    className="cursor-pointer"
                    onClick={() => handleEdit(procedure)}
                  >
                    {procedure.name}
                  </span>
                )}
              </td>

              <td className="px-2 py-1 align-top">
                {editingId === procedure._id ? (
                  <textarea
                    value={procedure.recommendation || ""}
                    onChange={(e) =>
                      handleInputChange(
                        procedure._id!,
                        "recommendation",
                        e.target.value
                      )
                    }
                    rows={2}
                    className="w-full border border-green-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-300 resize-none"
                  />
                ) : (
                  <span
                    className="cursor-pointer whitespace-pre-wrap"
                    onClick={() => handleEdit(procedure)}
                  >
                    <ExpandableText text={procedure.recommendation || ""} limit={120} />
                  </span>
                )}
              </td>

              <td className="px-2 py-1 align-top space-x-2">
                {editingId === procedure._id ? (
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => handleFinishEdit()}
                  >
                    Готово
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => handleEdit(procedure)}
                  >
                    Оновити
                  </button>
                )}
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={() => handleRemove(procedure._id!)}
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

export default SelectedProceduresTable;
