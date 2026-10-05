import { ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { FitTape } from "@/components/ui/FitTape";
import { cn } from "@/lib/cn";
import { STAGE_LABEL } from "@/features/tracker/stages";
import type { Kit } from "../api";
import { siteName } from "../options";
import { isApplied } from "../status";

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

/** Where the application stands, in a word or two, with a colour to match. */
function StatusPill({ kit }: { kit: Kit }) {
  const application = kit.application;
  const [text, tint, dot] =
    kit.status === "building"
      ? [
          "Being written",
          "bg-[color-mix(in_oklab,var(--tape)_22%,var(--surface))]",
          "bg-tape-deep",
        ]
      : kit.status === "failed"
        ? ["Didn't finish", "bg-pin-soft", "bg-pin"]
        : application && isApplied(kit)
          ? [
              application.stage === "applied" && application.applied_at
                ? `Applied ${shortDate(application.applied_at)}`
                : STAGE_LABEL[application.stage],
              "bg-[color-mix(in_oklab,var(--fit-strong)_14%,var(--surface))]",
              "bg-fit-strong",
            ]
          : ["Ready to check and send", "bg-chalk-soft", "bg-chalk"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.875rem] font-semibold text-ink",
        tint,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          dot,
          kit.status === "building" && "animate-pulse",
        )}
      />
      {text}
    </span>
  );
}

function Crumb({ to, children }: { to: string; children: string }) {
  return (
    <li className="flex min-w-0 items-center gap-1.5">
      <Link
        to={to}
        className="font-medium text-ink-2 [overflow-wrap:anywhere] hover:text-ink hover:underline"
      >
        {children}
      </Link>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3" />
    </li>
  );
}

/** Where you are (Jobs › the job › Your application), then the job and where it stands. */
export function KitHeader({ kit }: { kit: Kit }) {
  const site = siteName(kit.job_url);
  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.9375rem]">
          <Crumb to="/jobs">Jobs</Crumb>
          {kit.match_id && (
            <Crumb to={`/jobs/${kit.match_id}`}>{kit.job_title}</Crumb>
          )}
          <li aria-current="page" className="font-semibold text-ink">
            Your application
          </li>
        </ol>
      </nav>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <p className="text-[0.9375rem] font-medium text-ink-2">
            Your application for
          </p>
          <h1 className="type-title mt-1">
            {kit.job_title}{" "}
            <span className="font-normal text-ink-2">at {kit.company}</span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <StatusPill kit={kit} />
            {kit.job_url.startsWith("http") && (
              <a
                href={kit.job_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[0.9375rem] font-semibold text-chalk hover:underline"
              >
                View the ad on {site}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
        </div>
        {kit.score !== null && <FitTape score={kit.score} showLabel />}
      </header>
    </>
  );
}
