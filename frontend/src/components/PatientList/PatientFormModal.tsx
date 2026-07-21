import type { IPatient } from "#api/patientsApi";
import React, { useEffect, useRef, useState } from "react";

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
  title = "Нова картка пацієнта",
}) => {
  const [form, setForm] = useState<IPatient>(patient || { fullName: "" });
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (patient) setForm(patient);
  }, [patient]);

  useEffect(() => {
    if (visible) {
      setInvalid(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [visible]);

  if (!visible) return null;

  const handleSave = () => {
    if (!form.fullName.trim()) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4">
      <div className="relative bg-surface rounded-2xl p-7 w-full max-w-md shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Закрити"
          className="absolute top-3 right-4 text-2xl leading-none text-ink-soft hover:text-ink"
        >
          ×
        </button>

        <h2 className="text-[17px] tracking-[0.16em] uppercase mb-6">
          {title}
        </h2>

        <label className="block">
          <span className="block text-[14.5px] font-bold mb-1.5">
            ПІБ пацієнта
          </span>
          <input
            ref={inputRef}
            type="text"
            value={form.fullName}
            onChange={(e) => {
              setForm({ ...form, fullName: e.target.value });
              setInvalid(false);
            }}
            placeholder="Прізвище Імʼя По батькові"
            className={`w-full h-12 px-3.5 rounded-[0.625rem] border text-[16px] outline-none transition ${
              invalid
                ? "border-danger"
                : "border-line-strong focus:border-brand focus:ring-2 focus:ring-brand/20"
            }`}
          />
          {invalid && (
            <p className="text-danger text-[13.5px] mt-1.5">
              Вкажіть прізвище та імʼя пацієнта
            </p>
          )}
        </label>

        <div className="flex justify-end gap-2.5 mt-7">
          <button onClick={onClose} className="btn btn-ghost">
            Скасувати
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Зберегти
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientFormModal;
