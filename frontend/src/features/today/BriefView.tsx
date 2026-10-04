import {
  CircleAlert,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useMe } from "@/features/auth/api";
import { useToday, type Brief } from "@/features/brief/api";
import { useFindNow } from "@/features/brief/useFindNow";
import { MarketPulse } from "@/features/momentum/components/MarketPulse";
import { MomentumStrip } from "@/features/momentum/components/MomentumStrip";
import { greeting, longDate } from "@/lib/format";
import { BestMatches } from "./BestMatches";
import { nextUpdateLabel, searchLine, statusLine } from "./status";
import { WhileSearching } from "./WhileSearching";

/** Home once you're set up: what the latest job search found, and what to do next. */
export function BriefView() {
  const { data: user } = useMe();
  const today = useToday();
  const { find: findNow, starting } = useFindNow();
  const firstName = user?.name.split(" ")[0] ?? "";
  const brief = today.data?.brief;
  const building = brief?.status === "building";
  const next = nextUpdateLabel(today.data?.next_brief_at);
  const hasPreferences = today.data?.radar_ready ?? true;

  return (
    <div className="mx-auto w-full max-w-[64rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[0.9375rem] text-ink-2">{longDate(new Date())}</p>
        <h1 className="type-display mt-2">
          {greeting(new Date())}
          {firstName ? `, ${firstName}.` : "."}
        </h1>
        <p
          className="mt-4 max-w-[40rem] text-[1.125rem] leading-relaxed text-ink-2"
          aria-live="polite"
        >
          {today.isPending
            ? " "
            : hasPreferences
              ? statusLine(brief, next)
              : "Tell Tailr what job you want, and it starts finding jobs for you."}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {hasPreferences ? (
            <>
              <Button asChild size="lg">
                <Link to="/jobs">See all jobs</Link>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                icon={
                  <RefreshCw
                    className={building ? "size-4 animate-spin" : "size-4"}
                  />
                }
                onClick={findNow}
                disabled={building || starting}
              >
                {building ? "Searching" : "Find new jobs now"}
              </Button>
            </>
          ) : (
            <Button
              asChild
              size="lg"
              icon={<SlidersHorizontal className="size-4" />}
            >
              <Link to="/preferences">Set your job preferences</Link>
            </Button>
          )}
        </div>
        {hasPreferences && next && (
          <p className="mt-3 text-[0.875rem] text-ink-3">
            Next daily update: {next}. Change it in{" "}
            <Link to="/preferences" className="underline hover:text-ink">
              Job preferences
            </Link>
            .
          </p>
        )}
      </motion.header>

      <div className="mt-10 flex flex-col gap-8">
        {today.isPending ? (
          <div className="grid min-h-[24vh] place-items-center">
            <Spinner className="size-7 text-ink-3" />
          </div>
        ) : building && brief ? (
          <WhileSearching brief={brief} />
        ) : brief?.status === "failed" ? (
          <Failed brief={brief} onRetry={findNow} retrying={starting} />
        ) : brief && brief.matches.length > 0 ? (
          <Latest brief={brief} />
        ) : hasPreferences ? (
          <NothingYet
            hasSearched={Boolean(brief)}
            onFind={findNow}
            finding={starting}
          />
        ) : null}

        {/* After the latest search is loaded, so opening Home already counts as a day checked. */}
        {today.data && <MomentumStrip />}
        {today.data && <MarketPulse />}
      </div>
    </div>
  );
}

function Latest({ brief }: { brief: Brief }) {
  const line = searchLine(brief);
  return (
    <div>
      <BestMatches matches={brief.matches} total={brief.matches.length} />
      {line && <p className="mt-3 text-[0.875rem] text-ink-3">{line}</p>}
    </div>
  );
}

function Failed({
  brief,
  onRetry,
  retrying,
}: {
  brief: Brief;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-pin/30 bg-pin-soft p-5"
    >
      <p className="flex min-w-[min(100%,18rem)] flex-1 gap-2.5">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-pin" aria-hidden />
        {brief.error ?? "The job search didn't finish."}
      </p>
      <Button onClick={onRetry} loading={retrying}>
        Try again
      </Button>
    </div>
  );
}

function NothingYet({
  hasSearched,
  onFind,
  finding,
}: {
  hasSearched: boolean;
  onFind: () => void;
  finding: boolean;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-6 rounded-sheet border border-line bg-surface p-6 sm:p-8">
      <div className="flex min-w-[min(100%,20rem)] flex-1 gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-tape text-tape-ink">
          <Search className="size-6" aria-hidden />
        </span>
        <div>
          <h2 className="type-heading">
            {hasSearched ? "No new jobs this time" : "Find your first jobs"}
          </h2>
          <p className="mt-1 max-w-[34rem] text-ink-2">
            {hasSearched
              ? "Nothing new matched your preferences since the last search. Try widening them: another role, another place, or jobs up to a week old."
              : "Tailr searches LinkedIn and JobStreet, reads each job and shows how well it matches you. It runs in the background, so you can keep using Tailr."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {hasSearched && (
          <Button asChild variant="secondary">
            <Link to="/preferences">Change preferences</Link>
          </Button>
        )}
        <Button variant="tape" size="lg" onClick={onFind} loading={finding}>
          {hasSearched ? "Search again" : "Find jobs now"}
        </Button>
      </div>
    </section>
  );
}
