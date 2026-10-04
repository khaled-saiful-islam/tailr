import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { fitLabel, fitLevel } from "@/components/ui/fit";
import type { Match } from "@/features/brief/api";
import { cn } from "@/lib/cn";
import { whyLine } from "./status";

const DOT = {
  strong: "bg-fit-strong",
  good: "bg-fit-good",
  stretch: "bg-fit-stretch",
  low: "bg-fit-low",
} as const;

/** "86% match": ink text for contrast, a coloured dot for how good it is. */
export function MatchBadge({ score }: { score: number }) {
  const level = fitLevel(score);
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[0.8125rem] font-semibold text-ink">
      <span aria-hidden className={cn("size-2 rounded-full", DOT[level])} />
      <span className="type-figure text-[0.9375rem]">{score}%</span> match
      <span className="sr-only">, {fitLabel[level].toLowerCase()}</span>
    </span>
  );
}

/** The three best jobs from the latest search, each a link to its page. */
export function BestMatches({
  matches,
  total,
}: {
  matches: Match[];
  total: number;
}) {
  const top = matches.slice(0, 3);
  return (
    <section
      aria-labelledby="best-heading"
      className="rounded-sheet border border-line bg-surface shadow-sheet"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-5 sm:px-6">
        <h2 id="best-heading" className="type-heading">
          Best matches
        </h2>
        <p className="text-[0.875rem] text-ink-3">From the latest search</p>
      </div>
      <ul className="mt-3">
        {top.map((match, index) => {
          const why = whyLine(match);
          return (
            <motion.li
              key={match.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1 + index * 0.06,
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="border-t border-line first:border-t-0"
            >
              <Link
                to={`/jobs/${match.id}`}
                className="group flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-surface-2/60 focus-visible:bg-surface-2/60 focus-visible:outline-none sm:px-6"
              >
                <span className="min-w-[min(100%,16rem)] flex-1">
                  <span className="block font-semibold leading-snug group-hover:underline">
                    {match.job.title}
                  </span>
                  <span className="block text-[0.9375rem] text-ink-2">
                    {match.job.company}
                  </span>
                  {why && (
                    <span className="mt-1.5 block text-[0.9375rem] leading-relaxed text-ink-2">
                      {why}
                    </span>
                  )}
                </span>
                <MatchBadge score={match.score} />
              </Link>
            </motion.li>
          );
        })}
      </ul>
      <div className="border-t border-line px-5 py-3.5 sm:px-6">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 font-semibold text-chalk hover:underline"
        >
          {total > top.length ? `See all ${total} jobs` : "Open your Jobs page"}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
