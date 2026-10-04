import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { AddJobDialog } from "@/features/kits/components/AddJobDialog";
import { useRadar } from "@/features/radar/api";
import { useJobList, useToday, type Match, type MatchStatus } from "./api";
import { SearchBanner } from "./components/BriefProgress";
import { JobGroups } from "./components/JobGroups";
import { useFindNow } from "./useFindNow";

type Tab = "all" | MatchStatus;

const TABS: { key: Tab; label: string; empty: string }[] = [
  { key: "all", label: "All", empty: "" },
  {
    key: "new",
    label: "New",
    empty: "Nothing new. You've looked at every job.",
  },
  {
    key: "saved",
    label: "Saved",
    empty: "Save jobs you like and they'll wait for you here.",
  },
  {
    key: "dismissed",
    label: "Hidden",
    empty: "Jobs you hide go here, in case you change your mind.",
  },
];

function nextSearch(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function Empty({
  title,
  body,
  action,
}: {
  title?: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-sheet border border-dashed border-line-strong px-6 py-10 text-center">
      {title && <h2 className="type-heading">{title}</h2>}
      <p className={cn("mx-auto max-w-[34rem] text-ink-2", title && "mt-2")}>
        {body}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Every job Tailr found for you, best match first. */
export function JobsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const list = useJobList(tab);
  const today = useToday();
  const radar = useRadar();
  const { find: findNow, starting } = useFindNow();
  const client = useQueryClient();

  const brief = today.data?.brief;
  const searching = brief?.status === "building";
  const ready = today.data?.radar_ready && today.data?.profile_ready;
  const bar = radar.data?.settings.min_fit ?? 60;
  const next = nextSearch(today.data?.next_brief_at);

  // When a search finishes, show what it found.
  const wasSearching = useRef(searching);
  useEffect(() => {
    if (wasSearching.current && !searching)
      void client.invalidateQueries({ queryKey: ["matches"] });
    wasSearching.current = searching;
  }, [searching, client]);

  const counts = list.data?.pages[0]?.counts ?? {};
  const countFor = (key: Tab) =>
    key === "all"
      ? (counts.new ?? 0) + (counts.seen ?? 0) + (counts.saved ?? 0)
      : (counts[key] ?? 0);
  const items: Match[] = (list.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((m) => (tab === "dismissed") === (m.status === "dismissed"))
    .filter((m) => tab === "all" || tab === "dismissed" || m.status === tab);
  const current = TABS.find((t) => t.key === tab) ?? TABS[0]!;

  const findButton = (
    <Button
      variant="secondary"
      icon={<RefreshCw className={cn("size-4", searching && "animate-spin")} />}
      onClick={findNow}
      disabled={searching || starting || !ready}
    >
      {searching ? "Searching" : "Find new jobs now"}
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-[64rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-[min(100%,22rem)] flex-1">
          <h1 className="type-title">Jobs</h1>
          <p className="mt-2 max-w-[40rem] text-ink-2">
            Every job Tailr found for you on LinkedIn and JobStreet, best match
            first. Tailr adds new ones every morning.
          </p>
          {next && ready && (
            <p className="mt-1 text-[0.875rem] text-ink-3">
              Next search: {next}.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {findButton}
          <AddJobDialog />
        </div>
      </header>

      {searching && brief && (
        <div className="mt-6">
          <SearchBanner brief={brief} />
        </div>
      )}

      <div
        role="tablist"
        aria-label="Show"
        className="mt-8 flex flex-wrap gap-2"
      >
        {TABS.map((item) => {
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
              <span className={selected ? "opacity-75" : "text-ink-3"}>
                {countFor(item.key)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {list.isPending || today.isPending ? (
          <div className="grid min-h-[30vh] place-items-center">
            <Spinner className="size-7 text-ink-3" />
          </div>
        ) : list.isError ? (
          <p role="alert" className="text-pin">
            {list.error.message}
          </p>
        ) : items.length > 0 ? (
          <>
            <JobGroups items={items} bar={bar} hidden={tab === "dismissed"} />
            {list.hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="secondary"
                  loading={list.isFetchingNextPage}
                  onClick={() => void list.fetchNextPage()}
                >
                  Show older jobs
                </Button>
              </div>
            )}
          </>
        ) : tab !== "all" ? (
          <Empty body={current.empty} />
        ) : !today.data?.profile_ready ? (
          <Empty
            title="Add your CV first"
            body="Tailr compares every job with your experience, so it needs your CV before it can search."
            action={
              <Button asChild>
                <Link to="/profile">Add my CV</Link>
              </Button>
            }
          />
        ) : !today.data?.radar_ready ? (
          <Empty
            title="Tell Tailr what job you want"
            body="Pick the roles, places and pay you're looking for. Tailr then searches LinkedIn and JobStreet and lists the jobs here."
            action={
              <Button asChild>
                <Link to="/preferences">Set your job preferences</Link>
              </Button>
            }
          />
        ) : searching ? null : (
          <Empty
            title="No jobs yet"
            body={`Tailr searches every morning${next ? `; the next search is ${next}` : ""}. Or search right now; it runs in the background while you carry on.`}
            action={
              <Button onClick={findNow} loading={starting}>
                Find new jobs now
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
