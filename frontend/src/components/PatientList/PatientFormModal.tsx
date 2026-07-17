import type { IPatient } from "#api/patientsApi";
import React, { useEffect, useState } from "react";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (patient: IPatient) => void;
  patient?: IPatient;
  title?: string;
}

export const PatientFormModal: React.FC<Props> = ({
  visible,
  onClose,
  onSave,
  patient,
  title = "Створити карту пацієнта",
}) => {
  const [form, setForm] = useState<IPatient>(patient || { fullName: "" });

  useEffect(() => {
    if (patient) setForm(patient);
  }, [patient]);

  if (!visible) return null;

  const handleSave = () => {
    if (!form.fullName.trim()) {
      alert("Введіть ПІБ пацієнта!");
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-500 hover:text-black text-lg"
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold text-center text-green-800 mb-6">
          {title}
        </h2>

        <div className="space-y-4">
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="ПІБ пацієнта"
            className="border border-green-300 focus:ring-2 focus:ring-green-200 focus:outline-none p-2 rounded-lg w-full text-gray-800"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Скасувати
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Зберегти
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientFormModal;
