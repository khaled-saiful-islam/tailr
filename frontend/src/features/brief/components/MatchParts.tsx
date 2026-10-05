import { ArrowUpRight, Bookmark, BookmarkCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import { useUpdateMatch, type Match } from "../api";
import {
  WORK_MODE,
  foundLabel,
  payLabel,
  placeLabel,
  sourceLabel,
} from "../format";

/** Place, mode, pay, when it was posted and when Tailr found it, as quiet text that wraps. */
export function MatchMeta({
  match,
  className,
}: {
  match: Match;
  className?: string;
}) {
  const job = match.job;
  const posted = job.posted_at ? relativeTime(job.posted_at) : job.posted_text;
  const place = placeLabel(job.location);
  const mode = job.work_mode ? WORK_MODE[job.work_mode] : null;
  const items = [
    place,
    mode && mode !== place ? mode : null,
    payLabel(job),
    posted ? `${sourceLabel(job.source)}, ${posted}` : sourceLabel(job.source),
    foundLabel(match),
  ].filter(Boolean);
  return (
    <p
      className={cn(
        "flex flex-wrap gap-x-3 gap-y-0.5 text-[0.875rem] text-ink-2",
        className,
      )}
    >
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </p>
  );
}

/** Save, hide ("not interested") and open on the job site. */
export function MatchActions({
  match,
  compact = false,
}: {
  match: Match;
  compact?: boolean;
}) {
  const update = useUpdateMatch();
  const saved = match.status === "saved";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={saved ? "primary" : "secondary"}
        icon={
          saved ? (
            <BookmarkCheck className="size-4" />
          ) : (
            <Bookmark className="size-4" />
          )
        }
        onClick={() =>
          update.mutate({ id: match.id, status: saved ? "seen" : "saved" })
        }
        aria-pressed={saved}
      >
        {saved ? "Saved" : "Save job"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        icon={<X className="size-4" />}
        onClick={() => update.mutate({ id: match.id, status: "dismissed" })}
      >
        Not interested
      </Button>
      {!compact && (
        <Button
          size="sm"
          variant="ghost"
          icon={<ArrowUpRight className="size-4" />}
          asChild
        >
          <a href={match.job.url} target="_blank" rel="noreferrer">
            View on {sourceLabel(match.job.source)}
          </a>
        </Button>
      )}
    </div>
  );
}
