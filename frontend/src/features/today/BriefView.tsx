import { CircleAlert, RefreshCw, Sunrise } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useMe } from "@/features/auth/api";
import { useRunBrief, useToday, type Brief } from "@/features/brief/api";
import { BriefProgress } from "@/features/brief/components/BriefProgress";
import { MatchRow } from "@/features/brief/components/MatchRow";
import { TopPick } from "@/features/brief/components/TopPick";
import { MarketPulse } from "@/features/momentum/components/MarketPulse";
import { MomentumStrip } from "@/features/momentum/components/MomentumStrip";
import { greeting, longDate } from "@/lib/format";

function nextBriefLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function summary(brief: Brief | null | undefined): string {
  if (!brief) return "Your radar is on. Your first brief is on its way.";
  if (brief.status === "building")
    return "Tailr is measuring today's jobs against your profile.";
  if (brief.status === "failed") return "Today's brief didn't finish.";
  const count = brief.matches.length;
  if (brief.stats.below_bar && count)
    return `Nothing cleared your bar today. Here ${count === 1 ? "is the closest job" : `are the ${count} closest`}.`;
  if (count === 0) return "No new jobs fit you since your last brief.";
  const best = Math.max(...brief.matches.map((m) => m.score));
  return `${count} new ${count === 1 ? "job fits" : "jobs fit"} you. Your best fit is ${best}%.`;
}

/** Today with the radar on: the Morning Brief. */
export function BriefView() {
  const { data: user } = useMe();
  const today = useToday();
  const run = useRunBrief();
  const firstName = user?.name.split(" ")[0] ?? "";
  const brief = today.data?.brief;
  const building = brief?.status === "building";
  const next = nextBriefLabel(today.data?.next_brief_at);
  const [top, ...rest] = brief?.status === "ready" ? brief.matches : [];

  const runNow = () =>
    run.mutate(undefined, {
      onError: (error) => toast.error(error.message),
    });

  return (
    <div className="mx-auto w-full max-w-[76rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-[min(100%,24rem)] flex-1"
        >
          <p className="text-[0.9375rem] text-ink-2">{longDate(new Date())}</p>
          <h1 className="type-display mt-2">
            {greeting(new Date())}
            {firstName ? `, ${firstName}.` : "."}
          </h1>
          <p className="mt-4 max-w-[38rem] text-[1.125rem] text-ink-2">
            {today.isPending ? " " : summary(brief)}
          </p>
        </motion.div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Button
            variant="secondary"
            icon={
              <RefreshCw
                className={building ? "size-4 animate-spin" : "size-4"}
              />
            }
            onClick={runNow}
            disabled={building || run.isPending}
          >
            {building ? "Measuring" : "Run my brief now"}
          </Button>
          {next && (
            <p className="text-[0.8125rem] text-ink-3">Next brief {next}</p>
          )}
        </div>
      </header>

      {/* After today's brief is fetched, so opening it already counts toward the streak. */}
      {today.data && (
        <div className="mt-8">
          <MomentumStrip />
        </div>
      )}

      <div className="mt-10">
        {today.isPending ? (
          <div className="grid min-h-[30vh] place-items-center">
            <Spinner className="size-7 text-ink-3" />
          </div>
        ) : building && brief ? (
          <BriefProgress brief={brief} />
        ) : !brief ? (
          <FirstBrief next={next} onRun={runNow} running={run.isPending} />
        ) : brief.status === "failed" ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-pin/30 bg-pin-soft p-5"
          >
            <p className="flex gap-2.5">
              <CircleAlert
                className="mt-0.5 size-5 shrink-0 text-pin"
                aria-hidden
              />
              {brief.error ?? "Something went wrong."}
            </p>
            <Button onClick={runNow} loading={run.isPending}>
              Try again
            </Button>
          </div>
        ) : !top ? (
          <EmptyBrief />
        ) : (
          <div className="flex flex-col gap-8">
            <TopPick match={top} />
            {rest.length > 0 && (
              <section aria-labelledby="more-heading">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 id="more-heading" className="type-heading">
                    More that fit
                  </h2>
                  <Link
                    to="/jobs"
                    className="text-[0.9375rem] font-semibold text-chalk hover:underline"
                  >
                    All your jobs
                  </Link>
                </div>
                <ul className="mt-4 overflow-hidden rounded-panel border border-line bg-surface">
                  <AnimatePresence initial={false}>
                    {rest.map((match, index) => (
                      <MatchRow key={match.id} match={match} index={index} />
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            )}
            <Catch brief={brief} />
          </div>
        )}
      </div>

      {today.data && !building && <MarketPulse />}
    </div>
  );
}

function FirstBrief({
  next,
  onRun,
  running,
}: {
  next: string | null;
  onRun: () => void;
  running: boolean;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-6 rounded-sheet border border-line bg-surface p-6 sm:p-8">
      <div className="flex min-w-[min(100%,20rem)] flex-1 gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-tape text-tape-ink">
          <Sunrise className="size-6" aria-hidden />
        </span>
        <div>
          <h2 className="type-heading">
            {next ? `Your first brief arrives ${next}` : "Your radar is on"}
          </h2>
          <p className="mt-1 text-ink-2">
            Don't want to wait? Run it now: Tailr searches, reads every ad and
            measures each job against your profile.
          </p>
        </div>
      </div>
      <Button variant="tape" size="lg" onClick={onRun} loading={running}>
        Run my first brief
      </Button>
    </section>
  );
}

function EmptyBrief() {
  return (
    <section className="rounded-sheet border border-dashed border-line-strong p-8 text-center">
      <h2 className="type-heading">You're all caught up</h2>
      <p className="mx-auto mt-2 max-w-[32rem] text-ink-2">
        New jobs appear on LinkedIn and JobStreet through the day. To see more,
        widen your radar: add a role, a place, or allow a week instead of three
        days.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Button asChild variant="secondary">
          <Link to="/radar">Adjust my radar</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/jobs">See earlier jobs</Link>
        </Button>
      </div>
    </section>
  );
}

function Catch({ brief }: { brief: Brief }) {
  const stats = brief.stats as Record<string, number | undefined>;
  const figures = [
    { label: "found today", value: stats.found },
    { label: "new to you", value: stats.new },
    { label: "read in full", value: stats.read },
    { label: "fit your bar", value: brief.matches.length },
  ].filter((f) => typeof f.value === "number");
  return (
    <section
      aria-labelledby="catch-heading"
      className="rounded-panel border border-line bg-surface p-5"
    >
      <h2 id="catch-heading" className="type-label text-ink-2">
        Today's catch
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.label}>
            <dd className="type-figure text-[1.75rem] leading-none">
              {figure.value}
            </dd>
            <dt className="mt-1 text-[0.8125rem] text-ink-2">{figure.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
