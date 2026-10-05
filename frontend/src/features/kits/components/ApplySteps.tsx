import { ArrowDown, Check, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { Kit } from "../api";
import { siteName } from "../options";
import { isApplied } from "../status";
import type { Progress } from "../progress";
import { AppliedAction } from "./AppliedAction";

export type DocumentTab = "resume" | "letter";

function StepBadge({ number, done }: { number: number; done: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border-2 text-[0.875rem] font-semibold transition-colors duration-300",
        done
          ? "border-fit-strong bg-fit-strong text-white"
          : "border-ink text-ink",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {done ? (
          <motion.span
            key="done"
            initial={{ scale: 0, rotate: -60 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 20 }}
          >
            <Check className="size-4" strokeWidth={3} />
          </motion.span>
        ) : (
          <motion.span
            key="number"
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {number}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function Step({
  number,
  title,
  text,
  done,
  next,
  children,
}: {
  number: number;
  title: string;
  text: string;
  done: boolean;
  next: boolean;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        "relative flex flex-col gap-3 rounded-panel border bg-surface p-4 transition-[border-color,box-shadow] duration-300 sm:p-5",
        next
          ? "border-tape-deep shadow-[0_0_0_3px_color-mix(in_oklab,var(--tape)_35%,transparent)]"
          : "border-line",
      )}
    >
      <div className="flex items-start gap-3">
        <StepBadge number={number} done={done} />
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold leading-snug">
            <span className="sr-only">
              Step {number}
              {done ? ", done" : next ? ", next" : ""}:{" "}
            </span>
            {title}
            {next && (
              <span
                aria-hidden
                className="rounded-full bg-tape px-2 py-0.5 text-[0.75rem] font-semibold text-tape-ink"
              >
                Next
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-[0.875rem] text-ink-2">{text}</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">{children}</div>
    </li>
  );
}

/**
 * What to do with a prepared application, in order. The first two steps open the CV and
 * the cover letter below; each step ticks itself when it's done.
 */
export function ApplySteps({
  kit,
  progress,
  onOpen,
  onSite,
}: {
  kit: Kit;
  progress: Progress;
  onOpen: (tab: DocumentTab) => void;
  onSite: () => void;
}) {
  const site = siteName(kit.job_url);
  const applied = isApplied(kit);
  const done = [
    progress.cv || applied,
    progress.letter || applied,
    progress.site || applied,
    applied,
  ];
  const finished = done.filter(Boolean).length;
  const next = done.indexOf(false);

  return (
    <section aria-labelledby="steps-heading">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h2 id="steps-heading" className="type-heading">
          Four steps to apply
        </h2>
        <div className="flex min-w-[12rem] items-center gap-3 text-[0.875rem] text-ink-2">
          <span>{finished === 4 ? "All done" : `${finished} of 4 done`}</span>
          <span
            aria-hidden
            className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3"
          >
            <motion.span
              className="block h-full rounded-full bg-fit-strong"
              initial={false}
              animate={{ width: `${(finished / 4) * 100}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        </div>
      </div>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Step
          number={1}
          title="Check your CV"
          text="Read it, change anything, then download the PDF."
          done={done[0]!}
          next={next === 0}
        >
          <Button
            size="sm"
            variant={next === 0 ? "primary" : "secondary"}
            icon={<ArrowDown className="size-3.5" />}
            onClick={() => onOpen("resume")}
          >
            Open my CV
          </Button>
        </Step>
        <Step
          number={2}
          title="Check your cover letter"
          text="Make it sound like you. Copy it or download it."
          done={done[1]!}
          next={next === 1}
        >
          <Button
            size="sm"
            variant={next === 1 ? "primary" : "secondary"}
            icon={<ArrowDown className="size-3.5" />}
            onClick={() => onOpen("letter")}
          >
            Open my cover letter
          </Button>
        </Step>
        <Step
          number={3}
          title={`Apply on ${site}`}
          text="Attach your CV, and paste the cover letter if they ask for one."
          done={done[2]!}
          next={next === 2}
        >
          {kit.job_url.startsWith("http") ? (
            <Button
              size="sm"
              variant={next === 2 ? "primary" : "secondary"}
              asChild
            >
              <a
                href={kit.job_url}
                target="_blank"
                rel="noreferrer"
                onClick={onSite}
              >
                Open the job ad
                <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(opens {site})</span>
              </a>
            </Button>
          ) : (
            <span className="text-[0.875rem] text-ink-3">
              Use the link you found the job with.
            </span>
          )}
        </Step>
        <Step
          number={4}
          title="Mark as applied"
          text="Tailr reminds you to follow up after a week."
          done={done[3]!}
          next={next === 3}
        >
          <AppliedAction kit={kit} primary={next === 3} />
        </Step>
      </ol>
    </section>
  );
}
