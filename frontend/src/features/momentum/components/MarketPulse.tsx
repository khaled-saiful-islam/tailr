import { Activity, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/useMediaQuery";
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

function summary(pulse: Pulse): string {
  const good =
    pulse.good_fit > 0
      ? ` ${pulse.good_fit} of them match you 70% or more.`
      : "";
  return `From the ${pulse.jobs} jobs Tailr found for you in the last 7 days.${good}`;
}

/** What employers ask for and pay this week, from the jobs Tailr found for you. */
export function MarketPulse() {
  const pulse = usePulse();
  const wide = useMediaQuery("(min-width: 768px)");
  const [shown, setShown] = useState<boolean | null>(null);
  if (!pulse.data) return null;
  const data = pulse.data;
  // Open on wide screens, folded on phones, until you choose.
  const open = shown ?? wide;

  return (
    <section aria-labelledby="pulse-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="pulse-heading" className="type-heading">
          What employers want
        </h2>
        <p className="text-[0.875rem] text-ink-3">{range(data.since)}</p>
      </div>
      {data.ready ? (
        <>
          <p className="mt-1.5 max-w-[44rem] text-ink-2">
            The skills these jobs ask for, what they pay and who's hiring.{" "}
            {summary(data)}
          </p>
          <button
            type="button"
            onClick={() => setShown(!open)}
            aria-expanded={open}
            aria-controls="pulse-details"
            className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-control px-1 text-[0.9375rem] font-semibold text-chalk hover:underline"
          >
            {open ? "Hide the details" : "Show the details"}
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                id="pulse-details"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <Ready pulse={data} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <NotYet jobs={data.jobs} />
      )}
    </section>
  );
}

function NotYet({ jobs }: { jobs: number }) {
  return (
    <div className="mt-4 flex gap-3 rounded-panel border border-dashed border-line-strong p-5">
      <Activity className="mt-0.5 size-5 shrink-0 text-ink-3" aria-hidden />
      <p className="text-ink-2">
        This appears once Tailr has found a few jobs for you this week
        {jobs > 0 ? ` (${jobs} so far)` : ""}. It shows the skills these jobs
        ask for, what they pay, and who's hiring.
      </p>
    </div>
  );
}

function Ready({ pulse }: { pulse: Pulse }) {
  return (
    <div className="mt-3 grid gap-4 pb-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
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
  );
}
