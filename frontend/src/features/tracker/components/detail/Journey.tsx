import { Check, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import type { Application } from "../../api";
import { PATH, STAGE_LABEL, step, type Stage } from "../../stages";
import { Celebrate } from "./Celebrate";

const BIG: Stage[] = ["interview", "offer"];

/**
 * Where it stands: five steps along the path, the line filling up to the current one.
 * Pressing a step moves it there; reaching an interview or an offer gets a small cheer.
 */
export function Journey({
  app,
  onMove,
}: {
  app: Application;
  onMove: (stage: Stage) => void;
}) {
  const closed = app.stage === "rejected";
  const here = closed ? -1 : step(app.stage);
  // Celebrate stage changes made while the page is open, not the stage it opened on.
  const [seen, setSeen] = useState(app.stage);
  const [bursts, setBursts] = useState(0);
  if (seen !== app.stage) {
    setSeen(app.stage);
    if (BIG.includes(app.stage)) setBursts((count) => count + 1);
  }
  const filled = here <= 0 ? 0 : (here / (PATH.length - 1)) * 80;

  return (
    <section
      aria-labelledby="journey-heading"
      className="rounded-panel border border-line bg-surface px-4 pb-4 pt-5 sm:px-6"
    >
      <h2 id="journey-heading" className="sr-only">
        Where it stands
      </h2>
      <div
        role="group"
        aria-label="Stage"
        className="relative grid grid-cols-5"
      >
        <span
          aria-hidden
          className="absolute left-[10%] right-[10%] top-[17px] h-[3px] rounded-full bg-line"
        />
        <motion.span
          aria-hidden
          className="absolute left-[10%] top-[17px] h-[3px] rounded-full bg-ink"
          initial={false}
          animate={{ width: `${filled}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        {PATH.map((value, index) => {
          const current = value === app.stage;
          const passed = !closed && index < here;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={current}
              onClick={() => !current && onMove(value)}
              className="group relative flex flex-col items-center gap-1.5 rounded-control px-0.5 pb-1 text-center focus-visible:outline-2 focus-visible:outline-chalk"
            >
              <span className="relative">
                {/* Re-mounts when it becomes current, so the new step pops in once. */}
                <motion.span
                  key={current ? "current" : "step"}
                  initial={current ? { scale: 0.7 } : false}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 18 }}
                  className={cn(
                    "grid size-9 place-items-center rounded-full border-2 transition-colors duration-300",
                    current &&
                      "border-ink bg-ink text-surface shadow-[0_0_0_5px_color-mix(in_oklab,var(--tape)_45%,transparent)]",
                    passed && "border-ink bg-surface text-ink",
                    !current &&
                      !passed &&
                      "border-line-strong bg-surface text-ink-3 group-hover:border-ink-3 group-hover:text-ink-2",
                  )}
                >
                  {passed ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <span className="type-figure text-[0.8125rem]">
                      {index + 1}
                    </span>
                  )}
                </motion.span>
                {current && bursts > 0 && <Celebrate key={bursts} />}
              </span>
              <span
                className={cn(
                  "text-[0.75rem] leading-tight sm:text-[0.8125rem]",
                  current ? "font-semibold text-ink" : "text-ink-2",
                )}
              >
                {!current && <span className="sr-only">Move to </span>}
                {STAGE_LABEL[value]}
                {current && <span className="sr-only">, where it is now</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-3 text-[0.8125rem]">
        <p className="text-ink-3">
          {closed
            ? "Closed"
            : app.stage === "saved"
              ? "Saved"
              : `Moved to ${STAGE_LABEL[app.stage]}`}{" "}
          {relativeTime(app.stage_changed_at)}. Press a step to move it there.
        </p>
        {!closed && (
          <button
            type="button"
            onClick={() => onMove("rejected")}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line px-3 font-medium text-ink-2 transition-colors hover:border-pin/50 hover:text-ink"
          >
            <X className="size-3.5" aria-hidden />
            It didn't work out
          </button>
        )}
      </div>
    </section>
  );
}
