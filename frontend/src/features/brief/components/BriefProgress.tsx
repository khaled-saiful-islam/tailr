import { motion } from "motion/react";
import { Spinner } from "@/components/ui/Spinner";
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
      className="relative h-1 overflow-hidden rounded-full bg-surface-3"
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
 * A slim banner while Tailr searches for jobs. The search runs on the server, so the page
 * below stays as it is and fully usable; new jobs appear when it's done.
 */
export function SearchBanner({ brief }: { brief: Brief }) {
  const current = Math.max(
    0,
    STAGES.findIndex((s) => s.key === brief.stage),
  );
  const stage = STAGES[current]!;
  const note = detail(stage.key, brief.stats);
  return (
    <motion.section
      aria-live="polite"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-panel border border-tape-deep/40 bg-tape/15 px-4 py-3.5 sm:px-5"
    >
      <div className="flex gap-3">
        <span aria-hidden className="mt-0.5 shrink-0">
          <Spinner className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            Searching LinkedIn and JobStreet for new jobs.
          </p>
          <p className="mt-0.5 text-[0.9375rem] text-ink-2">
            This takes a minute or two; you can keep using Tailr. We'll tell you
            when they're ready.
          </p>
          <p className="mt-1.5 text-[0.875rem] text-ink-3">
            Step {current + 1} of {STAGES.length}: {stage.label}
            {note ? ` (${note})` : ""}.
          </p>
        </div>
      </div>
      <div className="mt-3">
        <Bar current={current} />
      </div>
    </motion.section>
  );
}
