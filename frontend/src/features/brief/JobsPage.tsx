import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { AddJobDialog } from "@/features/kits/components/AddJobDialog";
import { useMatches, type MatchStatus } from "./api";
import { MatchRow } from "./components/MatchRow";

type Tab = "all" | MatchStatus;

const TABS: { key: Tab; label: string; empty: string }[] = [
  {
    key: "all",
    label: "All",
    empty: "No jobs yet. Your morning brief fills this page.",
  },
  {
    key: "new",
    label: "New",
    empty: "Nothing new. You've looked at everything.",
  },
  {
    key: "saved",
    label: "Saved",
    empty: "Save jobs you like and they'll wait for you here.",
  },
  {
    key: "dismissed",
    label: "Not for me",
    empty: "Jobs you pass on go here, in case you change your mind.",
  },
];

/** Every job Tailr has measured for you, newest first. */
export function JobsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const query = useMatches(tab);
  const counts = query.data?.counts ?? {};
  const current = TABS.find((t) => t.key === tab) ?? TABS[0]!;

  return (
    <div className="mx-auto w-full max-w-[64rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[min(100%,18rem)] flex-1">
          <h1 className="type-title">Jobs</h1>
          <p className="mt-2 text-ink-2">
            Every job Tailr has measured for you, newest first.
          </p>
        </div>
        <AddJobDialog />
      </header>

      <div
        role="tablist"
        aria-label="Filter jobs"
        className="mt-8 flex flex-wrap gap-2"
      >
        {TABS.map((item) => {
          const count = item.key === "all" ? undefined : counts[item.key];
          const selected = tab === item.key;
          return (
            <button
              key={item.key}
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item.key)}
              className={cn(
                "flex h-9 items-center gap-2 rounded-full border px-4 text-[0.875rem] font-medium transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-ink"
                  : "border-line-strong text-ink-2 hover:text-ink",
              )}
            >
              {item.label}
              {count !== undefined && (
                <span className={selected ? "opacity-75" : "text-ink-3"}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {query.isPending ? (
          <div className="grid min-h-[30vh] place-items-center">
            <Spinner className="size-7 text-ink-3" />
          </div>
        ) : query.isError ? (
          <p className="text-pin">{query.error.message}</p>
        ) : query.data.items.length === 0 ? (
          <div className="rounded-sheet border border-dashed border-line-strong p-10 text-center">
            <p className="text-ink-2">{current.empty}</p>
            {tab === "all" && (
              <Button asChild variant="secondary" className="mt-5">
                <Link to="/">Go to today's brief</Link>
              </Button>
            )}
          </div>
        ) : (
          <ul className="overflow-hidden rounded-panel border border-line bg-surface">
            <AnimatePresence initial={false}>
              {query.data.items
                .filter((m) => tab === "dismissed" || m.status !== "dismissed")
                .filter((m) => tab === "all" || m.status === tab)
                .map((match, index) => (
                  <MatchRow key={match.id} match={match} index={index} />
                ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
