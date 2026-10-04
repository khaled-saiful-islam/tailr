import { ScanText } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { elapsedLabel } from "../reading";
import type { ScanStage } from "./ScanningDocument";

const HEADLINE: Record<ScanStage, string> = {
  uploading: "Opening your CV…",
  reading: "Reading your CV…",
  understanding: "Understanding your experience…",
  done: "Done",
};

/** What Tailr's AI is doing right now, a line at a time. */
const TASKS: Record<ScanStage, string[]> = {
  uploading: ["Opening your file"],
  reading: [
    "Scanning every page",
    "Pulling out each line of text",
    "Checking it's a CV",
  ],
  understanding: [
    "Finding your job titles and employers",
    "Spotting achievements with numbers",
    "Listing your skills and tools",
    "Sorting your education and certificates",
    "Putting it all into your profile",
  ],
  done: ["Ready to check"],
};

const STEPS: { stage: ScanStage; label: string }[] = [
  { stage: "uploading", label: "Upload" },
  { stage: "reading", label: "Read the text" },
  { stage: "understanding", label: "Understand it" },
  { stage: "done", label: "Ready" },
];
const ORDER: ScanStage[] = ["uploading", "reading", "understanding", "done"];

function useTicker(items: string[], every: number): string {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setIndex((value) => value + 1),
      every,
    );
    return () => window.clearInterval(timer);
  }, [every]);
  return items[index % items.length] ?? "";
}

function useSeconds(since: string | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!since) return 0;
  return Math.max(0, Math.round((now - new Date(since).getTime()) / 1000));
}

/** The words beside the scanner: the stage, a live line, how long it's taking. */
export function ReadingStatus({
  stage,
  filename,
  startedAt,
  scanned,
}: {
  stage: ScanStage;
  filename?: string;
  startedAt?: string;
  /** The file was a scan or photo, so it's read like a picture (slower). */
  scanned?: boolean;
}) {
  const reduce = useReducedMotion();
  const tasks = TASKS[stage];
  const task = useTicker(tasks, 2400);
  const seconds = useSeconds(startedAt);
  const here = ORDER.indexOf(stage);

  return (
    <div>
      <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-chalk">
        <span className="relative flex size-2.5">
          {!reduce && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-chalk opacity-60" />
          )}
          <span className="relative inline-flex size-2.5 rounded-full bg-chalk" />
        </span>
        Tailr's AI is working on it
      </p>
      <h1 className="type-title mt-3" aria-live="polite">
        {HEADLINE[stage]}
      </h1>
      {filename && (
        <p className="mt-2 text-ink-2 [overflow-wrap:anywhere]">{filename}</p>
      )}

      <div className="mt-6 min-h-7" aria-hidden>
        <AnimatePresence mode="wait">
          <motion.p
            key={task}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="text-[1.125rem] font-medium"
          >
            {task}…
          </motion.p>
        </AnimatePresence>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-label="Reading your CV"
        aria-valuetext={HEADLINE[stage]}
      >
        <motion.div
          className="h-full w-1/3 rounded-full bg-chalk"
          animate={reduce ? { x: "100%" } : { x: ["-100%", "300%"] }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </div>
      <p className="mt-2 text-[0.875rem] text-ink-3">
        {elapsedLabel(seconds)} so far. It usually takes 20 to 40 seconds
        {scanned ? ", a little longer for a scan" : ""}. This page updates by
        itself.
      </p>

      <ol className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
        {STEPS.map((step, index) => {
          const state =
            index < here ? "done" : index === here ? "active" : "waiting";
          return (
            <li
              key={step.stage}
              className={cn(
                "flex items-center gap-2 text-[0.875rem]",
                state === "waiting" ? "text-ink-3" : "text-ink",
                state === "active" && "font-semibold",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-5 place-items-center rounded-full text-[0.6875rem] font-bold",
                  state === "done" && "bg-ink text-canvas",
                  state === "active" && "bg-chalk text-white",
                  state === "waiting" && "border border-line-strong",
                )}
              >
                {index + 1}
              </span>
              {step.label}
              <span className="sr-only">
                {state === "done"
                  ? ", done"
                  : state === "active"
                    ? ", in progress"
                    : ""}
              </span>
            </li>
          );
        })}
      </ol>

      {scanned && (
        <p className="mt-6 flex gap-2.5 rounded-control bg-chalk-soft px-4 py-3 text-[0.9375rem] text-ink">
          <ScanText className="mt-0.5 size-4 shrink-0 text-chalk" aria-hidden />
          Your file is a scan or a photo, so Tailr is reading it like a person
          would. Check names and numbers carefully afterwards.
        </p>
      )}
    </div>
  );
}
