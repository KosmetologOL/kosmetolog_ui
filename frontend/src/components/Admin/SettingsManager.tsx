import {
  getSettings,
  updateSettings,
  type ISettings,
} from "#api/settingsApi";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const FIELDS: { key: keyof ISettings; label: string }[] = [
  { key: "medicationsNote", label: "Засоби" },
  { key: "homeCareNote", label: "Домашній догляд" },
  { key: "examsNote", label: "Обстеження" },
  { key: "proceduresNote", label: "Процедури" },
];

export default function SettingsManager({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const [settings, setSettings] = useState<ISettings>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch {
        toast.error("Не вдалося завантажити налаштування.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await updateSettings(settings);
      setSettings(saved);
      toast.success("Налаштування збережено.");
    } catch {
      toast.error("Не вдалося зберегти налаштування.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <p className="py-8 text-center text-ink-soft">Завантаження...</p>;
  }

  return (
    <div className="flex w-full flex-col items-start">
      <div className="mb-6">
        <h1 className="text-[21px] tracking-[0.08em] uppercase font-bold text-ink">
          Важливі тексти
        </h1>
        <p className="mt-0.5 text-xs text-ink-soft">
          Типовий текст, який автоматично підставляється під відповідною
          секцією у формі створення звіту. У кожному конкретному звіті його
          можна змінити — це не вплине на типовий текст тут.
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="card w-full">
            <p className="section-label">{label}</p>
            <textarea
              value={settings[key] ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, [key]: e.target.value }))
              }
              disabled={readOnly}
              rows={3}
              placeholder="Важливо..."
              className="field-textarea w-full min-h-[80px] resize-y"
            />
          </div>
        ))}
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary btn-sm mt-4"
        >
          {isSaving ? "Збереження..." : "Зберегти"}
        </button>
      )}
    </div>
  );
}
