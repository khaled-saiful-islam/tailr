import {
  ArrowRight,
  CalendarClock,
  Hourglass,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { fitLevel } from "@/components/ui/fit";
import type { Application } from "../api";
import { nextAction, type Tone } from "../next";

const FIT_TEXT = {
  strong: "text-fit-strong",
  good: "text-fit-good",
  stretch: "text-fit-stretch",
  low: "text-fit-low",
} as const;

const TONE: Record<Tone, { className: string; icon: LucideIcon | null }> = {
  act: { className: "font-semibold text-chalk", icon: ArrowRight },
  due: { className: "font-semibold text-ink", icon: CalendarClock },
  wait: { className: "text-ink-2", icon: Hourglass },
  good: { className: "font-semibold text-fit-strong", icon: PartyPopper },
  quiet: { className: "text-ink-3", icon: null },
};

/** A company's monogram: no third-party logos, so nothing leaks and nothing breaks. */
export function CompanyMark({
  company,
  className,
}: {
  company: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-[0.75rem] font-semibold tracking-[0.02em] text-ink-2",
        className,
      )}
    >
      {initials(company)}
    </span>
  );
}

/** The next thing to do, with an icon that says whether it's yours to do or theirs. */
export function NextLine({
  app,
  className,
}: {
  app: Application;
  className?: string;
}) {
  const next = nextAction(app);
  const { className: tone, icon: Icon } = TONE[next.tone];
  return (
    <p
      className={cn(
        "flex min-w-0 items-start gap-1.5 text-[0.8125rem] leading-snug",
        tone,
        className,
      )}
    >
      {next.tone === "due" ? (
        <span
          className="mt-[5px] size-2 shrink-0 rounded-full bg-tape motion-safe:animate-pulse"
          aria-hidden
        />
      ) : Icon ? (
        <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
      ) : null}
      <span>
        <span className="sr-only">Next: </span>
        {next.text}
      </span>
    </p>
  );
}

/** What a card shows: the job, its match, and the one thing that matters now. */
export function AppCardBody({ app }: { app: Application }) {
  return (
    <>
      <div className="flex items-start gap-2.5">
        <CompanyMark company={app.job.company} className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-ink">{app.job.title}</p>
          <p className="text-[0.875rem] leading-snug text-ink-2">
            {app.job.company}
          </p>
          {app.score !== null && (
            <p
              className={cn(
                "type-figure mt-0.5 text-[0.8125rem]",
                FIT_TEXT[fitLevel(app.score)],
              )}
            >
              {app.score}%
              <span className="font-sans font-normal text-ink-3"> match</span>
            </p>
          )}
        </div>
      </div>
      <NextLine
        app={app}
        className="mt-2.5 border-t border-dashed border-line pt-2.5"
      />
    </>
  );
}

export const cardClass =
  "relative block w-full rounded-control border border-line bg-surface p-3.5 text-left shadow-[0_1px_0_rgb(0_0_0/0.03)] transition-[border-color,box-shadow,transform] duration-200 hover:border-line-strong hover:shadow-sheet motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk";
