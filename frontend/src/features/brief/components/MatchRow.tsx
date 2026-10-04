import { Bookmark, BookmarkCheck, Undo2, X } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { IconButton } from "@/components/ui/controls";
import { FitTape } from "@/components/ui/FitTape";
import { cn } from "@/lib/cn";
import { useUpdateMatch, type Match } from "../api";
import { MatchMeta } from "./MatchParts";

/** One job in a list: its match, the job, why it matches, and save or hide. */
export function MatchRow({
  match,
  index = 0,
}: {
  match: Match;
  index?: number;
}) {
  const update = useUpdateMatch();
  const saved = match.status === "saved";
  const fresh = match.status === "new";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, height: 0 }}
      transition={{
        delay: Math.min(index, 10) * 0.04,
        duration: 0.35,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative border-b border-line last:border-b-0"
    >
      <div className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-surface-2/60 sm:flex-row sm:items-start sm:gap-5 sm:px-5">
        <div className="shrink-0 sm:pt-1">
          <FitTape score={match.score} size="sm" animated={index < 12} />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to={`/jobs/${match.id}`}
            className="font-semibold leading-snug text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-chalk"
          >
            {fresh && (
              <span
                className="mr-2 inline-block size-2 rounded-full bg-tape align-middle"
                aria-label="New"
              />
            )}
            {match.job.title}
          </Link>
          <p className="text-[0.9375rem] text-ink">{match.job.company}</p>
          <MatchMeta match={match} className="mt-0.5" />
          {match.review.headline && (
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">
              {match.review.headline}
            </p>
          )}
        </div>
        <div
          className={cn(
            "relative z-10 flex shrink-0 gap-1 self-end sm:self-start",
            "sm:opacity-60 sm:group-hover:opacity-100",
          )}
        >
          {match.status === "dismissed" ? (
            <IconButton
              label="Show again"
              onClick={() => update.mutate({ id: match.id, status: "seen" })}
            >
              <Undo2 className="size-[18px]" />
            </IconButton>
          ) : (
            <>
              <IconButton
                label={saved ? "Saved: remove from saved" : "Save job"}
                onClick={() =>
                  update.mutate({
                    id: match.id,
                    status: saved ? "seen" : "saved",
                  })
                }
                className={saved ? "text-ink" : undefined}
              >
                {saved ? (
                  <BookmarkCheck className="size-[18px]" />
                ) : (
                  <Bookmark className="size-[18px]" />
                )}
              </IconButton>
              <IconButton
                label="Not interested: hide this job"
                onClick={() =>
                  update.mutate({ id: match.id, status: "dismissed" })
                }
              >
                <X className="size-[18px]" />
              </IconButton>
            </>
          )}
        </div>
      </div>
    </motion.li>
  );
}
