import { ChevronDown } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/cn";
import type { Match } from "../api";
import { MatchRow } from "./MatchRow";

/** Above this many, the weaker matches start folded away. */
const FOLD_AFTER = 5;

function List({ items }: { items: Match[] }) {
  return (
    <ul className="overflow-hidden rounded-panel border border-line bg-surface">
      <AnimatePresence initial={false}>
        {items.map((match, index) => (
          <MatchRow key={match.id} match={match} index={index} />
        ))}
      </AnimatePresence>
    </ul>
  );
}

function Heading({
  title,
  count,
  note,
}: {
  title: string;
  count: number;
  note?: ReactNode;
}) {
  return (
    <div className="mb-3">
      <h2 className="type-heading flex items-baseline gap-2">
        {title}
        <span className="type-figure text-[1rem] text-ink-3">{count}</span>
      </h2>
      {note && <p className="mt-1 text-[0.9375rem] text-ink-2">{note}</p>}
    </div>
  );
}

const byScore = (a: Match, b: Match) => b.score - a.score;

/**
 * Good matches first (at or above the user's minimum match), then the others,
 * folded away when there are many. Hidden jobs are one plain list.
 */
export function JobGroups({
  items,
  bar,
  hidden,
}: {
  items: Match[];
  bar: number;
  hidden: boolean;
}) {
  const good = items.filter((m) => m.score >= bar).sort(byScore);
  const other = items.filter((m) => m.score < bar).sort(byScore);
  const [open, setOpen] = useState<boolean | null>(null);
  const showOther = open ?? (good.length === 0 || other.length <= FOLD_AFTER);

  if (hidden) return <List items={[...items].sort(byScore)} />;

  return (
    <div className="flex flex-col gap-10">
      {good.length > 0 && (
        <section aria-labelledby="good-jobs">
          <div id="good-jobs">
            <Heading
              title="Good matches"
              count={good.length}
              note={`${bar}% match or more, best first.`}
            />
          </div>
          <List items={good} />
        </section>
      )}
      {other.length > 0 && (
        <section aria-labelledby="other-jobs">
          <div id="other-jobs">
            <Heading
              title={good.length ? "Other jobs" : "Closest jobs"}
              count={other.length}
              note={
                <>
                  {good.length
                    ? `Below your minimum match of ${bar}%.`
                    : `None reached your minimum match of ${bar}% yet. These are the closest.`}{" "}
                  Change it in{" "}
                  <Link
                    to="/preferences"
                    className="font-semibold text-chalk hover:underline"
                  >
                    Job preferences
                  </Link>
                  .
                </>
              }
            />
          </div>
          {showOther ? <List items={other} /> : null}
          {good.length > 0 && other.length > FOLD_AFTER && (
            <button
              type="button"
              onClick={() => setOpen(!showOther)}
              aria-expanded={showOther}
              className={cn(
                "inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-chalk hover:underline",
                showOther && "mt-3",
              )}
            >
              {showOther
                ? "Hide other jobs"
                : `Show ${other.length} other jobs`}
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  showOther && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          )}
        </section>
      )}
    </div>
  );
}
