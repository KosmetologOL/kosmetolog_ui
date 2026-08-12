import type { IPatient } from "#api/patientsApi";
import Modal from "#components/Modal";
import Spinner from "#components/Spinner";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (patient: { fullName: string }) => void | Promise<void>;
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
  const [form, setForm] = useState<IPatient>(patient ?? { fullName: "" });
  const [invalid, setInvalid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ресет форми лише при відкритті модалки (false→true) — щоб ре-рендер
  // батька не стирав уже введений текст.
  useEffect(() => {
    if (visible) {
      setForm(patient ?? { fullName: "" });
      setInvalid(false);
      setIsSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    setIsSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      toast.error("Не вдалося зберегти картку");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      closeDisabled={isSaving}
      labelledBy="patient-form-title"
      panelClassName="p-7"
    >
      <form onSubmit={handleSubmit} noValidate>
        <h2 id="patient-form-title" className="modal-title mb-6">
          {title}
        </h2>

        <label className="block">
          <span className="field-label">ПІБ пацієнта</span>
          <input
            ref={inputRef}
            data-autofocus
            type="text"
            value={form.fullName}
            onChange={(e) => {
              setForm({ ...form, fullName: e.target.value });
              setInvalid(false);
            }}
            placeholder="Прізвище імʼя по батькові"
            className={`field-input ${invalid ? "is-invalid" : ""}`}
          />
          {invalid && (
            <p className="field-error">Вкажіть прізвище та імʼя пацієнта</p>
          )}
        </label>

        <div className="flex justify-end gap-2.5 mt-7">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="btn btn-ghost"
          >
            Скасувати
          </button>
          <button type="submit" disabled={isSaving} className="btn btn-primary">
            {isSaving ? (
              <>
                <Spinner />
                Зберігаємо…
              </>
            ) : (
              "Зберегти"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PatientFormModal;
