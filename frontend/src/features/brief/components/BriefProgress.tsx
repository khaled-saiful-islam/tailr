import { Check } from "lucide-react";
import { motion } from "motion/react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import type { Brief } from "../api";

const STAGES = [
  { key: "searching", label: "Searching LinkedIn and JobStreet" },
  { key: "reading", label: "Reading each job ad" },
  { key: "measuring", label: "Measuring your fit" },
  { key: "reviewing", label: "Writing your reviews" },
] as const;

function detail(stage: string, stats: Record<string, unknown>): string | null {
  const n = (key: string) =>
    typeof stats[key] === "number" ? (stats[key] as number) : null;
  if (stage === "reading" && n("found") !== null)
    return `${n("found")} found, ${n("new") ?? 0} new to you`;
  if (stage === "measuring" && n("read") !== null)
    return `${n("read")} jobs read`;
  if (stage === "reviewing" && n("candidates") !== null)
    return `${n("candidates")} strong candidates`;
  return null;
}

/** Live progress while the brief is being built (usually under a minute). */
export function BriefProgress({ brief }: { brief: Brief }) {
  const current = STAGES.findIndex((s) => s.key === brief.stage);
  return (
    <section
      aria-live="polite"
      className="rounded-sheet border border-line bg-surface p-6 sm:p-7"
    >
      <h2 className="type-heading">Measuring today's jobs for you</h2>
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
              className="flex items-center gap-3"
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
      <div
        aria-hidden
        className="relative mt-7 h-1.5 overflow-hidden rounded-full bg-surface-3"
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
    </section>
  );
}
