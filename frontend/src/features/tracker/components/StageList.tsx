import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import { Segmented } from "@/components/ui/choice";
import type { Application } from "../api";
import { toColumns } from "../board";
import {
  STAGE_HINT,
  STAGE_LABEL,
  STAGE_MEANING,
  STAGES,
  type Stage,
} from "../stages";
import { AppCardBody, cardClass } from "./AppCard";

/** On phones: one stage at a time, as a list. Each card opens its own page. */
export function StageList({ items }: { items: Application[] }) {
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
      <p className="mt-3 text-[0.875rem] text-ink-2">{STAGE_MEANING[stage]}</p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.ol
          key={stage}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-3 flex flex-col gap-2"
          aria-label={STAGE_LABEL[stage]}
        >
          {ids.map((id) => {
            const app = byId.get(id);
            return app ? (
              <li key={id}>
                <Link to={`/applications/${id}`} className={cardClass}>
                  <AppCardBody app={app} />
                </Link>
              </li>
            ) : null;
          })}
          {ids.length === 0 && (
            <li className="rounded-control border border-dashed border-line-strong px-4 py-6 text-center text-[0.9375rem] text-ink-3">
              {STAGE_HINT[stage]}
            </li>
          )}
        </motion.ol>
      </AnimatePresence>
    </div>
  );
}
