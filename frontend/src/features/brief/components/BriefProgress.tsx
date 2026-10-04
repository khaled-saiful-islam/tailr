import { Check } from "lucide-react";
import { motion } from "motion/react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import type { Brief } from "../api";

const STAGES = [
  { key: "searching", label: "Searching LinkedIn and JobStreet" },
  { key: "reading", label: "Reading each job ad" },
  { key: "measuring", label: "Comparing each job with your profile" },
  { key: "reviewing", label: "Explaining the best matches" },
] as const;

function detail(stage: string, stats: Record<string, unknown>): string | null {
  const n = (key: string) =>
    typeof stats[key] === "number" ? (stats[key] as number) : null;
  if (stage === "reading" && n("found") !== null)
    return `${n("found")} found, ${n("new") ?? 0} new to you`;
  if (stage === "measuring" && n("read") !== null)
    return `${n("read")} jobs read`;
  if (stage === "reviewing" && n("candidates") !== null)
    return `${n("candidates")} close matches`;
  return null;
}

function Bar({ current }: { current: number }) {
  return (
    <div
      aria-hidden
      className="relative h-1.5 overflow-hidden rounded-full bg-surface-3"
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-tape"
        initial={{ width: "4%" }}
        animate={{
          width: `${Math.max(8, ((current + 0.5) / STAGES.length) * 100)}%`,
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/**
 * Live progress while Tailr searches for jobs (usually under a minute).
 * `compact` is a one-line banner, for the top of the Jobs page.
 */
export function BriefProgress({
  brief,
  compact = false,
}: {
  brief: Brief;
  compact?: boolean;
}) {
  const current = Math.max(
    0,
    STAGES.findIndex((s) => s.key === brief.stage),
  );
  if (compact) {
    const stage = STAGES[current]!;
    const note = detail(stage.key, brief.stats);
    return (
      <section
        aria-live="polite"
        className="rounded-panel border border-tape-deep/40 bg-tape/15 px-5 py-4"
      >
        <p className="flex items-center gap-2.5 font-semibold">
          <Spinner className="size-4" />
          Searching LinkedIn and JobStreet for new jobs.
        </p>
        <p className="mt-1 text-[0.9375rem] text-ink-2">
          This takes about a minute. New jobs appear here when it's done.{" "}
          <span className="text-ink">
            {stage.label}
            {note ? `: ${note}` : ""}.
          </span>
        </p>
        <div className="mt-3">
          <Bar current={current} />
        </div>
      </section>
    );
  }
  return (
    <section
      aria-live="polite"
      className="rounded-sheet border border-line bg-surface p-6 sm:p-7"
    >
      <h2 className="type-heading">Finding new jobs for you</h2>
      <p className="mt-1 text-ink-2">
        This usually takes under a minute. You can leave this page; it carries
        on.
      </p>
      <ol className="mt-6 flex flex-col gap-4">
        {STAGES.map((stage, index) => {
          const state =
            index < current ? "done" : index === current ? "active" : "waiting";
          const note =
            state === "active" ? detail(stage.key, brief.stats) : null;
          return (
            <motion.li
              key={stage.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1"
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border",
                  state === "done" && "border-ink bg-ink text-canvas",
                  state === "active" && "border-tape bg-tape text-tape-ink",
                  state === "waiting" && "border-line-strong text-ink-3",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3.5" />
                ) : state === "active" ? (
                  <Spinner className="size-3.5" />
                ) : null}
              </span>
              <span
                className={cn(
                  "font-medium",
                  state === "waiting" && "text-ink-3",
                )}
              >
                {stage.label}
              </span>
              {note && (
                <span className="text-[0.875rem] text-ink-3">{note}</span>
              )}
            </motion.li>
          );
        })}
      </ol>
      <div className="mt-7">
        <Bar current={current} />
      </div>
    </section>
  );
}
