import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { PATH, STAGE_LABEL, step, type Stage } from "../stages";

/** Where it stands: five steps along the path, and a way out. */
export function StageStepper({
  stage,
  applied,
  onChange,
}: {
  stage: Stage;
  /** Whether it was ever sent: reopening goes back to Applied, or else Saved. */
  applied: boolean;
  onChange: (stage: Stage) => void;
}) {
  const here = step(stage);
  const closed = stage === "rejected";
  return (
    <div>
      <div
        role="group"
        aria-label="Stage"
        className="relative grid grid-cols-5 gap-1"
      >
        <span
          aria-hidden
          className="absolute left-[10%] right-[10%] top-[15px] h-px bg-line-strong"
        />
        {PATH.map((value, index) => {
          const current = value === stage;
          const passed = !closed && index < here;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={current}
              onClick={() => onChange(value)}
              className="group relative flex flex-col items-center gap-1.5 rounded-control px-0.5 pb-1 text-center focus-visible:outline-2 focus-visible:outline-chalk"
            >
              <span
                className={cn(
                  "grid size-[31px] place-items-center rounded-full border-2 bg-surface transition-colors",
                  current && "border-ink bg-ink text-surface",
                  passed && "border-ink text-ink",
                  !current &&
                    !passed &&
                    "border-line-strong text-ink-3 group-hover:border-ink-3",
                )}
              >
                {passed ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <span className="type-figure text-[0.75rem]">
                    {index + 1}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[0.75rem] leading-tight",
                  current ? "font-semibold text-ink" : "text-ink-2",
                )}
              >
                {STAGE_LABEL[value]}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-pressed={closed}
        onClick={() =>
          onChange(closed ? (applied ? "applied" : "saved") : "rejected")
        }
        className={cn(
          "mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-medium transition-colors",
          closed
            ? "border-pin/40 bg-pin-soft text-ink"
            : "border-line text-ink-2 hover:border-line-strong hover:text-ink",
        )}
      >
        <X className="size-3.5" aria-hidden />
        {closed ? "Not this time (reopen)" : "Not this time"}
      </button>
    </div>
  );
}
