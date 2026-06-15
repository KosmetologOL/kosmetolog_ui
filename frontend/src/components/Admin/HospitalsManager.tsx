import {
  createHospital,
  deleteHospital,
  getHospitals,
  updateHospital,
} from "#api/adminApi";
import React, { useEffect, useState } from "react";

const HospitalsManager: React.FC = () => {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const h = await getHospitals();
    setHospitals(h || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    if (editingId) {
      await updateHospital(editingId, {
        name: name.trim(),
        address: address.trim(),
      });
      setEditingId(null);
    } else {
      await createHospital({ name: name.trim(), address: address.trim() });
    }
    setName("");
    setAddress("");
    void load();
  };

  const edit = (h: any) => {
    setEditingId(h._id);
    setName(h.name);
    setAddress(h.address || "");
  };

  const remove = async (id: string) => {
    if (!window.confirm("Видалити цю лікарню?")) return;
    await deleteHospital(id);
    void load();
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-green-700">
        Лікарні та адреси
      </h2>

      <div className="mb-4 flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-[38px] flex-1 rounded-md border border-green-300 px-2 py-[9px]"
          placeholder="Назва лікарні/клініки"
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="min-h-[38px] flex-1 rounded-md border border-green-300 px-2 py-[9px]"
          placeholder="Адреса"
        />
        <button
          onClick={add}
          className="rounded-md bg-green-600 px-4 py-2 text-white font-medium transition-all hover:bg-green-700 active:scale-95"
        >
          {editingId ? "Оновити" : "Додати"}
        </button>
        {editingId && (
          <button
            onClick={() => {
              setEditingId(null);
              setName("");
              setAddress("");
            }}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 font-medium transition-all hover:bg-gray-50 active:scale-95"
          >
            Скасувати
          </button>
        )}
      </div>

      <div className="space-y-2">
        {hospitals.map((h) => (
          <div
            key={h._id}
            className="flex flex-col items-start justify-between rounded border border-green-200 bg-green-50 p-3 sm:flex-row sm:items-center"
          >
            <div className="flex-1">
              <div className="font-medium text-green-700">{h.name}</div>
              {h.address && (
                <div className="text-sm text-gray-600">{h.address}</div>
              )}
            </div>
            <div className="mt-2 flex gap-2 sm:mt-0">
              <button
                onClick={() => edit(h)}
                className="rounded-md bg-amber-500 px-3 py-1.5 text-white text-sm font-medium transition-all hover:bg-amber-600 active:scale-95"
              >
                Редагувати
              </button>
              <button
                onClick={() => remove(h._id)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-white text-sm font-medium transition-all hover:bg-red-700 active:scale-95"
              >
                Видалити
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HospitalsManager;
