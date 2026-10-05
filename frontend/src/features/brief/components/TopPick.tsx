import { Check, CircleDashed } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { FitTape } from "@/components/ui/FitTape";
import type { Match } from "../api";
import { sentence } from "../format";
import { MatchActions, MatchMeta } from "./MatchParts";
import { TailrsTake } from "./TailrsTake";

/** The best new job, given room to show why it matches. */
export function TopPick({ match }: { match: Match }) {
  const review = match.review;
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-sheet border border-line bg-surface shadow-sheet"
      aria-labelledby={`top-${match.id}`}
    >
      <div
        aria-hidden
        className="h-1.5 bg-[repeating-linear-gradient(90deg,var(--tape)_0_14px,var(--tape-deep)_14px_15px)]"
      />
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          <p className="type-label text-ink-2">Best match today</p>
          <h2 id={`top-${match.id}`} className="type-title mt-2">
            <Link
              to={`/jobs/${match.id}`}
              className="hover:underline hover:decoration-tape hover:decoration-2 hover:underline-offset-4"
            >
              {match.job.title}
            </Link>
          </h2>
          <p className="mt-1 text-[1.0625rem] font-medium">
            {match.job.company}
          </p>
          <MatchMeta match={match} className="mt-1" />
          {review.headline && (
            <TailrsTake text={review.headline} className="mt-5" large />
          )}
          {review.why.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {review.why.map((reason) => (
                <li
                  key={reason}
                  className="flex gap-2.5 text-[0.9375rem] text-ink-2"
                >
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-fit-strong"
                    aria-hidden
                  />
                  {reason}
                </li>
              ))}
            </ul>
          )}
          {review.gaps.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {review.gaps.slice(0, 2).map((gap) => (
                <li
                  key={gap.text}
                  className="flex gap-2.5 text-[0.9375rem] text-ink-2"
                >
                  <CircleDashed
                    className="mt-0.5 size-4 shrink-0 text-fit-stretch"
                    aria-hidden
                  />
                  <span>
                    <span className="text-ink">{sentence(gap.text)}.</span>{" "}
                    {gap.tip}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link to={`/jobs/${match.id}`}>See why it matches</Link>
            </Button>
            <MatchActions match={match} compact />
          </div>
        </div>
        <div className="flex flex-col justify-start gap-3 lg:border-l lg:border-line lg:pl-6">
          <FitTape score={match.score} size="lg" />
          <p className="text-[0.875rem] text-ink-3">
            Compared with your CV and job preferences.
          </p>
        </div>
      </div>
    </motion.article>
  );
}
