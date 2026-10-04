import { ArrowUpRight, Lock, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import type { PreviewOut, RadarOptions } from "../api";
import { RadarScope } from "./RadarScope";

const FRESHNESS: Record<number, string> = {
  1: "the last 24 hours",
  3: "the last 3 days",
  7: "the last week",
};

/** Plain-language reasons for jobs the preview left out. */
const DROPPED: Record<string, (n: number) => string> = {
  off_target: (n) =>
    `${n} ${n === 1 ? "wasn't" : "weren't"} the kind of role you're after`,
  duplicate: (n) =>
    `${n} ${n === 1 ? "was" : "were"} the same job on another site`,
  too_old: (n) => `${n} ${n === 1 ? "was" : "were"} posted too long ago`,
  location: (n) =>
    `${n} ${n === 1 ? "was" : "were"} outside the places you chose`,
  work_mode: (n) => `${n} didn't offer the way you want to work`,
  job_type: (n) => `${n} ${n === 1 ? "was" : "were"} a different type of job`,
  seniority: (n) => `${n} ${n === 1 ? "was" : "were"} at a different level`,
  salary: (n) => `${n} paid below your minimum`,
  no_salary: (n) => `${n} didn't show a salary`,
  excluded_word: (n) => `${n} mentioned a word you leave out`,
  excluded_company: (n) =>
    `${n} ${n === 1 ? "was" : "were"} at companies you leave out`,
  missing_must_have: (n) =>
    `${n} didn't mention any of the words a job must mention`,
};

interface PreviewPanelProps {
  preview: PreviewOut | undefined;
  scanning: boolean;
  error: string | null;
  freshness: number;
  options: RadarOptions | undefined;
  hasRoles: boolean;
  onRescan: () => void;
}

export function PreviewPanel({
  preview,
  scanning,
  error,
  freshness,
  options,
  hasRoles,
  onRescan,
}: PreviewPanelProps) {
  const [showDropped, setShowDropped] = useState(false);
  const dropped = Object.entries(preview?.dropped ?? {}).filter(
    ([, n]) => n > 0,
  );
  const locked = (options?.sources ?? []).filter((s) => !s.available);

  return (
    <section
      aria-labelledby="preview-title"
      className="rounded-sheet border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="preview-title" className="type-heading">
          A quick look: jobs on LinkedIn and JobStreet right now
        </h2>
        <button
          type="button"
          onClick={onRescan}
          disabled={scanning || !hasRoles}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px] px-2 py-1.5 text-[0.875rem] font-semibold text-chalk hover:bg-chalk-soft disabled:opacity-50"
        >
          <RefreshCw
            className={cn("size-3.5", scanning && "animate-spin")}
            aria-hidden
          />
          Look again
        </button>
      </div>
      <p className="mt-2 rounded-control bg-surface-2 px-3 py-2 text-[0.875rem] text-ink-2">
        This is only a preview. Press <strong>Save and find jobs</strong> to add
        jobs to your Jobs page.
      </p>

      <div className="mt-4 flex flex-col items-center">
        <RadarScope contacts={preview?.matching ?? 0} scanning={scanning} />
      </div>

      <div className="mt-4 text-center" aria-live="polite">
        {!hasRoles ? (
          <p className="text-ink-2">
            Add a job title and Tailr takes a quick look.
          </p>
        ) : error ? (
          <p className="text-pin">{error}</p>
        ) : preview ? (
          <>
            <p
              className={cn(
                "type-figure text-[3rem] leading-none transition-opacity",
                scanning && "opacity-40",
              )}
            >
              {preview.matching}
            </p>
            <p className="mt-2 font-semibold">
              {preview.matching === 1
                ? "recent job matches"
                : "recent jobs match"}{" "}
              your preferences
            </p>
            <p className="mt-1 text-[0.9375rem] text-ink-2">
              Out of {preview.found} posted in{" "}
              {FRESHNESS[freshness] ?? "recent days"}.
            </p>
          </>
        ) : (
          <p className="flex items-center justify-center gap-2 text-ink-2">
            <Spinner className="size-4" /> Looking on LinkedIn and JobStreet…
          </p>
        )}
        {scanning && preview && (
          <p className="mt-2 text-[0.8125rem] text-ink-3">
            Looking again with your changes…
          </p>
        )}
      </div>

      {preview && hasRoles && (
        <>
          <ul className="mt-6 flex flex-col gap-1 border-t border-line pt-4">
            {preview.sources.map((source) => (
              <li
                key={source.key}
                className="flex items-baseline justify-between gap-3 text-[0.9375rem]"
              >
                <span className="font-medium">{source.label}</span>
                <span
                  className={cn(
                    "text-right",
                    source.status === "failed" ? "text-pin" : "text-ink-2",
                  )}
                >
                  {source.status === "failed"
                    ? "Not answering right now"
                    : source.status === "off"
                      ? "Switched off"
                      : `${source.found} found, ${source.matching} match`}
                </span>
              </li>
            ))}
            {locked.map((source) => (
              <li
                key={source.key}
                className="flex items-baseline justify-between gap-3 text-[0.9375rem] text-ink-3"
              >
                <span className="flex shrink-0 items-center gap-1.5">
                  <Lock className="size-3.5" aria-hidden />
                  {source.label}
                </span>
                <span className="min-w-0 text-right">{source.note}</span>
              </li>
            ))}
          </ul>

          {dropped.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowDropped((v) => !v)}
                aria-expanded={showDropped}
                className="text-[0.875rem] font-semibold text-ink-2 hover:text-ink"
              >
                {showDropped ? "Hide" : "Why"}{" "}
                {dropped.reduce((sum, [, n]) => sum + n, 0)} were left out
              </button>
              <AnimatePresence initial={false}>
                {showDropped && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-2 flex flex-col gap-1 overflow-hidden text-[0.875rem] text-ink-2"
                  >
                    {dropped.map(([reason, count]) => (
                      <li key={reason}>
                        {DROPPED[reason]?.(count) ??
                          `${count} left out (${reason})`}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}

          {preview.samples.length > 0 && (
            <div className="mt-6 border-t border-line pt-4">
              <h3 className="type-label text-ink-2">Newest jobs found</h3>
              <ul className="mt-3 flex flex-col gap-3">
                {preview.samples.map((job) => (
                  <li key={job.url}>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-start justify-between gap-3 rounded-[10px] p-2 -m-2 transition-colors hover:bg-surface-2"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug">
                          {job.title}
                        </span>
                        <span className="block text-[0.875rem] text-ink-2">
                          {[job.company, job.location?.split(",")[0]]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                        <span className="mt-0.5 block text-[0.8125rem] text-ink-3">
                          {job.source === "linkedin" ? "LinkedIn" : "JobStreet"}
                          {job.posted_at
                            ? `, ${relativeTime(job.posted_at)}`
                            : job.posted_text
                              ? `, ${job.posted_text}`
                              : ""}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="mt-1 size-4 shrink-0 text-ink-3 group-hover:text-ink"
                        aria-label="Opens the job site"
                      />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[0.8125rem] text-ink-3">
                Match scores appear on your Jobs page once you save and search,
                worked out from your whole profile.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
