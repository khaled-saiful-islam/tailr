import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { fitLabel, fitLevel } from "@/components/ui/fit";
import { payLabel, WORK_MODE } from "@/features/brief/format";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import type { Application } from "../../api";
import { dayLabel } from "../../dates";
import { CompanyMark } from "../AppCard";

const FIT_PILL = {
  strong:
    "bg-[color-mix(in_oklab,var(--fit-strong)_14%,transparent)] text-fit-strong",
  good: "bg-[color-mix(in_oklab,var(--fit-good)_14%,transparent)] text-fit-good",
  stretch:
    "bg-[color-mix(in_oklab,var(--fit-stretch)_14%,transparent)] text-fit-stretch",
  low: "bg-surface-2 text-ink-2",
} as const;

/** "full_time" → "Full time". */
function plain(value: string | null | undefined): string | null {
  if (!value) return null;
  const words = value.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const linkClass =
  "inline-flex items-center gap-1 font-semibold text-chalk underline-offset-4 hover:underline";

/** Back to the board, then the job: title, company, match, and where to read more. */
export function JobHeader({ app }: { app: Application }) {
  const where = [app.job.company, app.job.location].filter(Boolean).join(", ");
  return (
    <header>
      <Link
        to="/applications"
        className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> My applications
      </Link>
      <div className="mt-5 flex items-start gap-4">
        <CompanyMark
          company={app.job.company}
          className="size-14 rounded-[14px] text-[1rem]"
        />
        <div className="min-w-0 flex-1">
          <h1 className="type-title">{app.job.title}</h1>
          <p className="mt-1.5 text-[1.0625rem] text-ink-2">{where}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.9375rem]">
            {app.score !== null && (
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-[0.875rem] font-semibold",
                  FIT_PILL[fitLevel(app.score)],
                )}
              >
                <span className="type-figure">{app.score}%</span> match,{" "}
                {fitLabel[fitLevel(app.score)].toLowerCase()}
              </span>
            )}
            <a
              href={app.job.url}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Job ad <ArrowUpRight className="size-4" aria-hidden />
              <span className="sr-only">(opens the job site)</span>
            </a>
            {app.match_id && (
              <Link to={`/jobs/${app.match_id}`} className={linkClass}>
                Job details
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/** The facts that don't change: pay, place, type, and when things happened. */
export function AboutJob({ app }: { app: Application }) {
  const { job } = app;
  const facts = [
    {
      label: "Where",
      value: [job.location, job.work_mode && WORK_MODE[job.work_mode]]
        .filter(Boolean)
        .join(", "),
    },
    { label: "Pay", value: payLabel(job) },
    { label: "Type", value: plain(job.employment_type) },
    {
      label: "Posted",
      value: job.posted_at ? relativeTime(job.posted_at) : job.posted_text,
    },
    { label: "Saved", value: relativeTime(app.created_at) },
    {
      label: "Applied",
      value: app.applied_at ? dayLabel(app.applied_at) : null,
    },
  ].filter((fact): fact is { label: string; value: string } =>
    Boolean(fact.value),
  );
  return (
    <section
      aria-labelledby="about-job"
      className="rounded-panel border border-line bg-surface p-5"
    >
      <h2 id="about-job" className="text-[1.0625rem] font-semibold">
        About the job
      </h2>
      <dl className="mt-3 flex flex-col">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="flex items-baseline justify-between gap-4 border-b border-line py-2 text-[0.9375rem] last:border-b-0"
          >
            <dt className="shrink-0 text-ink-3">{fact.label}</dt>
            <dd className="min-w-0 text-right">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
