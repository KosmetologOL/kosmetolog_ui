import type { IProcedure } from "#api/proceduresApi";
import FormattedText from "#components/FormattedText";
import SearchProcedure from "#components/Procedures/SearchProcedure";
import NoteField from "#components/ReportForm/NoteField";
import {
  INTERVAL_OPTIONS,
  WORK_WITH_OPTIONS,
  ZONE_OPTIONS,
} from "#components/ReportForm/procedureStageOptions";
import Select from "#components/Select";
import React from "react";

/**
 * Процедура всередині етапу. `_id` завжди присутній: для збережених
 * процедур це збережений ідентифікатор, для нових — згенерований uuid.
 * Саме він є єдиним ключем для key/оновлень/видалення.
 */
export type StageProcedure = Omit<IProcedure, "_id"> & {
  _id: string;
  comment?: string;
  zoneEnabled?: boolean;
  zone?: string;
  zoneOther?: boolean;
  intervalEnabled?: boolean;
  interval?: string;
  intervalOther?: boolean;
  visitCountEnabled?: boolean;
  visitCount?: number;
};

export interface IProcedureStage {
  id: string;
  title: string;
  workWithEnabled?: boolean;
  workWith?: string;
  procedures: StageProcedure[];
}

export const OTHER_OPTION = "Інше";

interface Props {
  stage: IProcedureStage;
  onUpdate: (id: string, updated: IProcedureStage) => void;
  onRemove: (stage: IProcedureStage) => void;
  onEditProcedure: (stageId: string, procedure: StageProcedure) => void;
}

const ProcedureStageCard: React.FC<Props> = ({
  stage,
  onUpdate,
  onRemove,
  onEditProcedure,
}) => {
  const patchStage = (patch: Partial<IProcedureStage>) =>
    onUpdate(stage.id, { ...stage, ...patch });

  const patchProcedure = (
    procedureId: string,
    patch: Partial<StageProcedure>,
  ) =>
    patchStage({
      procedures: stage.procedures.map((p) =>
        p._id === procedureId ? { ...p, ...patch } : p,
      ),
    });

  const stageRecommendations = [
    ...new Map(stage.procedures.map((p) => [p.name, p.recommendation])).entries(),
  ];

  return (
    <div className="stage-card anim-rise">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={stage.title}
            onChange={(e) => patchStage({ title: e.target.value })}
            aria-label="Назва етапу"
            className="field-input h-9 w-[220px] flex-none"
          />

          <label className="flex h-9 flex-none cursor-pointer select-none items-center gap-1.5 text-sm font-medium text-ink-soft">
            <input
              type="checkbox"
              checked={!!stage.workWithEnabled}
              onChange={(e) =>
                patchStage({ workWithEnabled: e.target.checked })
              }
            />
            Робота з
          </label>
          <Select
            value={stage.workWith || ""}
            disabled={!stage.workWithEnabled}
            onValueChange={(value) => patchStage({ workWith: value })}
            options={WORK_WITH_OPTIONS}
            className="h-9 w-[320px] flex-none"
          />
        </div>

        <button
          type="button"
          onClick={() => onRemove(stage)}
          className="btn btn-ghost btn-sm text-danger"
        >
          Видалити етап
        </button>
      </div>

      <SearchProcedure
        selectedProcedures={stage.procedures}
        setSelectedProcedures={(updated) => {
          const newProcedures =
            typeof updated === "function"
              ? updated(stage.procedures)
              : updated;

          patchStage({
            procedures: newProcedures.map((p) => {
              const existing = stage.procedures.find(
                (sp) => sp._id === p._id,
              );
              return {
                ...p,
                _id: p._id ?? crypto.randomUUID(),
                comment: existing?.comment ?? "",
                zoneEnabled: existing?.zoneEnabled ?? true,
                intervalEnabled: existing?.intervalEnabled ?? true,
                visitCountEnabled: existing?.visitCountEnabled ?? true,
                visitCount: existing?.visitCount,
              };
            }),
          });
        }}
      />

      {stage.procedures.map((proc) => (
        <div key={proc._id} className="proc-card anim-rise">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[14.5px] font-bold">{proc.name}</p>
            </div>
            <div className="flex flex-none gap-2">
              <button
                type="button"
                onClick={() => onEditProcedure(stage.id, proc)}
                className="btn btn-ghost btn-sm"
              >
                Оновити
              </button>
              <button
                type="button"
                onClick={() =>
                  patchStage({
                    procedures: stage.procedures.filter(
                      (p) => p._id !== proc._id,
                    ),
                  })
                }
                className="chip-remove"
                aria-label={`Видалити процедуру «${proc.name}»`}
              >
                ×
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex h-9 flex-none cursor-pointer select-none items-center gap-1.5 text-sm font-medium text-ink-soft">
              <input
                type="checkbox"
                checked={!!proc.zoneEnabled}
                onChange={(e) =>
                  patchProcedure(proc._id, { zoneEnabled: e.target.checked })
                }
              />
              Зона
            </label>
            <Select
              value={proc.zoneOther ? OTHER_OPTION : proc.zone || ""}
              disabled={!proc.zoneEnabled}
              onValueChange={(value) =>
                patchProcedure(proc._id, {
                  zoneOther: value === OTHER_OPTION,
                  zone: value === OTHER_OPTION ? "" : value,
                })
              }
              options={ZONE_OPTIONS}
              className="h-9 w-[160px] flex-none"
            />
            {proc.zoneOther && (
              <input
                type="text"
                value={proc.zone || ""}
                disabled={!proc.zoneEnabled}
                onChange={(e) =>
                  patchProcedure(proc._id, { zone: e.target.value })
                }
                placeholder="Вкажіть зону"
                className="field-input h-9 w-[180px] flex-none"
              />
            )}

            <label className="flex h-9 flex-none cursor-pointer select-none items-center gap-1.5 text-sm font-medium text-ink-soft">
              <input
                type="checkbox"
                checked={!!proc.intervalEnabled}
                onChange={(e) =>
                  patchProcedure(proc._id, {
                    intervalEnabled: e.target.checked,
                  })
                }
              />
              Інтервал
            </label>
            <Select
              value={proc.intervalOther ? OTHER_OPTION : proc.interval || ""}
              disabled={!proc.intervalEnabled}
              onValueChange={(value) =>
                patchProcedure(proc._id, {
                  intervalOther: value === OTHER_OPTION,
                  interval: value === OTHER_OPTION ? "" : value,
                })
              }
              options={INTERVAL_OPTIONS}
              className="h-9 w-[160px] flex-none"
            />
            {proc.intervalOther && (
              <input
                type="text"
                value={proc.interval || ""}
                disabled={!proc.intervalEnabled}
                onChange={(e) =>
                  patchProcedure(proc._id, { interval: e.target.value })
                }
                placeholder="Вкажіть інтервал"
                className="field-input h-9 w-[180px] flex-none"
              />
            )}

            <label className="flex h-9 flex-none cursor-pointer select-none items-center gap-1.5 text-sm font-medium text-ink-soft">
              <input
                type="checkbox"
                checked={!!proc.visitCountEnabled}
                onChange={(e) =>
                  patchProcedure(proc._id, {
                    visitCountEnabled: e.target.checked,
                  })
                }
              />
              Кількість візитів
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={proc.visitCount ?? ""}
              disabled={!proc.visitCountEnabled}
              onChange={(e) =>
                patchProcedure(proc._id, {
                  visitCount:
                    e.target.value === ""
                      ? undefined
                      : Number(e.target.value),
                })
              }
              aria-label="Кількість візитів"
              className="field-input h-9 w-[100px] flex-none"
            />
          </div>
        </div>
      ))}

      {stageRecommendations.length > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-surface-2 p-4">
          <p className="sub-label mb-2">Рекомендації щодо процедур</p>
          <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
            {stageRecommendations.map(([name, rec]) => (
              <li key={name}>
                <strong className="text-ink">{name}:</strong>{" "}
                <FormattedText
                  inline
                  markdown={rec}
                  fallback="Рекомендація відсутня"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {stage.procedures.map((proc) => (
        <NoteField
          key={proc._id}
          className="mt-3"
          label={proc.name}
          value={proc.comment || ""}
          onChange={(value) => patchProcedure(proc._id, { comment: value })}
          placeholder="Памʼятка до процедури"
        />
      ))}
    </div>
  );
};

export default React.memo(ProcedureStageCard);
