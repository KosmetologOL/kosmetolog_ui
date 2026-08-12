import {
  getSettings,
  updateSettings,
  type ISettings,
} from "#api/settingsApi";
import Spinner from "#components/Spinner";
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
  const [initialSettings, setInitialSettings] = useState<ISettings>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = FIELDS.some(
    ({ key }) => (settings[key] ?? "") !== (initialSettings[key] ?? ""),
  );

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSettings();
        setSettings(data);
        setInitialSettings(data);
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
      setInitialSettings(saved);
      toast.success("Налаштування збережено.");
    } catch {
      toast.error("Не вдалося зберегти налаштування.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <p className="py-8 text-center text-ink-soft">Завантаження…</p>;
  }

  return (
    <div className="flex w-full flex-col items-start">
      <div className="mb-6">
        <h2 className="panel-title">Важливі тексти</h2>
        <p className="mt-0.5 text-xs text-ink-soft">
          Типовий текст, який автоматично підставляється під відповідною
          секцією у формі створення звіту. У кожному конкретному звіті його
          можна змінити — це не вплине на типовий текст тут.
        </p>
      </div>

      <div className="flex w-full flex-col">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="stage-card w-full">
            <label htmlFor={`settings-${key}`} className="section-label block">
              {label}
            </label>
            <textarea
              id={`settings-${key}`}
              value={settings[key] ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, [key]: e.target.value }))
              }
              disabled={readOnly}
              rows={3}
              placeholder="Важливо…"
              className="field-textarea w-full min-h-[80px] resize-y"
            />
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="btn btn-primary btn-sm"
          >
            {isSaving ? (
              <>
                <Spinner />
                Зберігаємо…
              </>
            ) : (
              "Зберегти"
            )}
          </button>
          {isDirty && !isSaving && (
            <span className="text-sm text-ink-soft">Є незбережені зміни</span>
          )}
        </div>
      )}
    </div>
  );
}
