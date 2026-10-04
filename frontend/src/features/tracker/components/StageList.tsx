import { useState } from "react";
import { Segmented } from "@/components/ui/choice";
import type { Application } from "../api";
import { toColumns } from "../board";
import { STAGE_HINT, STAGE_LABEL, STAGES, type Stage } from "../stages";
import { AppCardBody, cardClass } from "./AppCard";

/** On phones: one stage at a time, as a list. Moving happens in the sheet. */
export function StageList({
  items,
  onOpen,
}: {
  items: Application[];
  onOpen: (id: string) => void;
}) {
  const columns = toColumns(items);
  const byId = new Map(items.map((item) => [item.id, item]));
  const first = STAGES.find((stage) => columns[stage].length > 0) ?? "saved";
  const [stage, setStage] = useState<Stage>(first);
  const ids = columns[stage];
  return (
    <div>
      <Segmented
        label="Stage"
        size="sm"
        value={stage}
        onChange={setStage}
        options={STAGES.map((value) => ({
          value,
          label: `${STAGE_LABEL[value]} ${columns[value].length}`,
        }))}
      />
      <ol className="mt-4 flex flex-col gap-2" aria-label={STAGE_LABEL[stage]}>
        {ids.map((id) => {
          const app = byId.get(id);
          return app ? (
            <li key={id}>
              <button
                type="button"
                className={cardClass}
                onClick={() => onOpen(id)}
              >
                <AppCardBody app={app} />
              </button>
            </li>
          ) : null;
        })}
        {ids.length === 0 && (
          <li className="rounded-control border border-dashed border-line-strong px-4 py-6 text-center text-[0.9375rem] text-ink-3">
            {STAGE_HINT[stage]}
          </li>
        )}
      </ol>
    </div>
  );
}
