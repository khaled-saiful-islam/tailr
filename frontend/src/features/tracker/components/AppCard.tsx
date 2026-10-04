import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { fitLevel } from "@/components/ui/fit";
import type { Application } from "../api";
import { statusLine } from "../board";

const FIT_TEXT = {
  strong: "text-fit-strong",
  good: "text-fit-good",
  stretch: "text-fit-stretch",
  low: "text-fit-low",
} as const;

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

/** What a card shows: the job, the one thing that matters now, and its fit. */
export function AppCardBody({ app }: { app: Application }) {
  const status = statusLine(app);
  return (
    <>
      <div className="flex items-start gap-2.5">
        <CompanyMark company={app.job.company} className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-ink">{app.job.title}</p>
          <p className="text-[0.875rem] leading-snug text-ink-2">
            {app.job.company}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-2">
        <p
          className={cn(
            "flex min-w-0 items-baseline gap-1.5 text-[0.8125rem] leading-snug",
            status.tone === "due" && "font-semibold text-ink",
            status.tone === "good" && "text-fit-strong",
            status.tone === "quiet" && "text-ink-3",
          )}
        >
          {status.tone === "due" && (
            <span
              className="size-1.5 shrink-0 translate-y-[-1px] rounded-full bg-tape"
              aria-hidden
            />
          )}
          {status.text}
        </p>
        {app.score !== null && (
          <span
            className={cn(
              "type-figure shrink-0 text-[0.8125rem]",
              FIT_TEXT[fitLevel(app.score)],
            )}
          >
            <span className="sr-only">Fit </span>
            {app.score}%
          </span>
        )}
      </div>
    </>
  );
}

export const cardClass =
  "relative block w-full rounded-control border border-line bg-surface p-3.5 text-left shadow-[0_1px_0_rgb(0_0_0/0.03)] transition-[border-color,box-shadow] hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk";
