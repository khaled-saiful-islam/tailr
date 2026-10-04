import { Activity } from "lucide-react";
import { usePulse, type Pulse } from "../api";
import {
  CompaniesHiring,
  PayRange,
  SkillDemand,
  WorkModes,
} from "./PulseParts";

function range(since: string): string {
  const format = new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
  });
  return `${format.format(new Date(`${since}T12:00:00`))} to ${format.format(new Date())}`;
}

/** What this week's jobs for you ask for and pay, from the jobs Tailr matched. */
export function MarketPulse() {
  const pulse = usePulse();
  if (!pulse.data) return null;
  const data = pulse.data;

  return (
    <section aria-labelledby="pulse-heading" className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="pulse-heading" className="type-heading">
          This week in your market
        </h2>
        <p className="text-[0.875rem] text-ink-3">{range(data.since)}</p>
      </div>
      {data.ready ? <Ready pulse={data} /> : <NotYet jobs={data.jobs} />}
    </section>
  );
}

function NotYet({ jobs }: { jobs: number }) {
  return (
    <div className="mt-4 flex gap-3 rounded-panel border border-dashed border-line-strong p-5">
      <Activity className="mt-0.5 size-5 shrink-0 text-ink-3" aria-hidden />
      <p className="text-ink-2">
        Market pulse appears once Tailr has matched a few jobs this week
        {jobs > 0 ? ` (${jobs} so far)` : ""}. It shows the skills these jobs
        ask for, what they pay, and who's hiring.
      </p>
    </div>
  );
}

function Ready({ pulse }: { pulse: Pulse }) {
  return (
    <>
      <p className="mt-1.5 max-w-[44rem] text-ink-2">
        From the {pulse.jobs} jobs Tailr matched to you in the last 7 days
        {pulse.good_fit > 0
          ? `; ${pulse.good_fit} of them fit you at 70% or more.`
          : "."}
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <SkillDemand skills={pulse.skills ?? []} />
        <div className="flex flex-col gap-4">
          <PayRange
            pay={pulse.pay ?? null}
            minimum={pulse.your_minimum ?? null}
          />
          <WorkModes modes={pulse.modes ?? {}} total={pulse.jobs} />
          <CompaniesHiring companies={pulse.companies ?? []} />
        </div>
      </div>
    </>
  );
}
