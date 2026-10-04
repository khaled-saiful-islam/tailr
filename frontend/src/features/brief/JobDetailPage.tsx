import { ArrowLeft, Check, CircleDashed, Info, Scissors } from "lucide-react";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { FitTape } from "@/components/ui/FitTape";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { useMatch, type MatchDetail } from "./api";
import { PART_LABEL, PART_ORDER, sentence } from "./format";
import { MatchActions, MatchMeta } from "./components/MatchParts";

export function JobDetailPage() {
  const { matchId = "" } = useParams();
  const query = useMatch(matchId);

  if (query.isPending) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner className="size-7 text-ink-3" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="mx-auto max-w-[40rem] px-5 py-16 text-center">
        <p className="text-ink-2">{query.error.message}</p>
        <Button asChild variant="secondary" className="mt-6">
          <Link to="/jobs">Back to jobs</Link>
        </Button>
      </div>
    );
  }
  const match = query.data;

  return (
    <div className="mx-auto w-full max-w-[80rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Jobs
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <article className="min-w-0">
          <h1 className="type-title">{match.job.title}</h1>
          <p className="mt-2 text-[1.125rem] font-medium">{match.job.company}</p>
          <MatchMeta match={match} className="mt-1" />
          {match.job.applicants && <p className="mt-1 text-[0.875rem] text-ink-3">{match.job.applicants}</p>}
          <div className="mt-5">
            <MatchActions match={match} />
          </div>

          {match.insights && <Insights detail={match} />}

          <section aria-labelledby="ad-heading" className="mt-10">
            <h2 id="ad-heading" className="type-heading">
              The job ad
            </h2>
            {match.description ? (
              <div className="mt-4 max-w-[46rem] whitespace-pre-line rounded-panel border border-line bg-surface p-5 text-[0.9375rem] leading-relaxed text-ink sm:p-6">
                {match.description}
              </div>
            ) : (
              <p className="mt-3 text-ink-2">The full ad is on the job site.</p>
            )}
          </section>
        </article>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <FitPanel detail={match} />
        </aside>
      </div>
    </div>
  );
}

function Insights({ detail }: { detail: MatchDetail }) {
  const insights = detail.insights!;
  return (
    <section aria-labelledby="summary-heading" className="mt-10">
      <h2 id="summary-heading" className="type-heading">
        In short
      </h2>
      <p className="mt-3 max-w-[46rem] text-[1.0625rem] leading-relaxed">{insights.summary}</p>
      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-[0.9375rem]">
        {insights.min_years !== null && (
          <div>
            <dt className="text-ink-3">Experience</dt>
            <dd className="font-medium">{insights.min_years}+ years</dd>
          </div>
        )}
        {insights.education && (
          <div>
            <dt className="text-ink-3">Education</dt>
            <dd className="font-medium">{insights.education}</dd>
          </div>
        )}
        {insights.languages.length > 0 && (
          <div>
            <dt className="text-ink-3">Languages</dt>
            <dd className="font-medium">{insights.languages.join(", ")}</dd>
          </div>
        )}
        {insights.agency && (
          <div>
            <dt className="text-ink-3">Posted by</dt>
            <dd className="font-medium">A recruitment agency</dd>
          </div>
        )}
      </dl>
      {detail.requirements.length > 0 && (
        <>
          <h3 className="type-label mt-6 text-ink-2">
            What they ask for{" "}
            <span className="font-normal text-ink-3">
              ({detail.requirements.filter((r) => r.have).length} of {detail.requirements.length} in your profile)
            </span>
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {detail.requirements.map((requirement) => (
              <li
                key={requirement.skill}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.875rem] text-ink",
                  requirement.have
                    ? "border-fit-strong/40 bg-[color-mix(in_oklab,var(--fit-strong)_10%,transparent)]"
                    : "border-dashed border-fit-stretch/60",
                )}
              >
                {requirement.have ? (
                  <Check className="size-3.5 text-fit-strong" aria-label="In your profile" />
                ) : (
                  <CircleDashed className="size-3.5 text-fit-stretch" aria-label="Not in your profile" />
                )}
                {requirement.skill}
              </li>
            ))}
          </ul>
        </>
      )}
      {insights.concerns.length > 0 && (
        <div className="mt-6 flex gap-2.5 rounded-control bg-surface-2 px-4 py-3 text-[0.9375rem]">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-2" aria-hidden />
          <p>
            <span className="font-semibold">Worth knowing: </span>
            {insights.concerns.join(". ")}.
          </p>
        </div>
      )}
    </section>
  );
}

function FitPanel({ detail }: { detail: MatchDetail }) {
  const review = detail.review;
  return (
    <section aria-labelledby="fit-heading" className="rounded-sheet border border-line bg-surface p-5 shadow-sheet sm:p-6">
      <h2 id="fit-heading" className="type-label text-ink-2">
        Your fit
      </h2>
      <FitTape score={detail.score} size="lg" className="mt-3" />
      {review.headline && <p className="chalk-mark mt-5 leading-relaxed">{review.headline}</p>}

      <dl className="mt-6 flex flex-col gap-3">
        {PART_ORDER.filter((part) => detail.parts[part] !== undefined).map((part, index) => (
          <div key={part}>
            <div className="flex items-baseline justify-between text-[0.875rem]">
              <dt className="text-ink-2">{PART_LABEL[part]}</dt>
              <dd className="type-figure">{detail.parts[part]}</dd>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className="h-full rounded-full bg-ink"
                initial={{ width: 0 }}
                animate={{ width: `${detail.parts[part]}%` }}
                transition={{ delay: 0.15 + index * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </dl>

      {review.why.length > 0 && (
        <>
          <h3 className="type-label mt-6">Why you fit</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {review.why.map((reason) => (
              <li key={reason} className="flex gap-2.5 text-[0.9375rem] text-ink-2">
                <Check className="mt-0.5 size-4 shrink-0 text-fit-strong" aria-hidden />
                {reason}
              </li>
            ))}
          </ul>
        </>
      )}
      {review.gaps.length > 0 && (
        <>
          <h3 className="type-label mt-6">Gaps worth addressing</h3>
          <ul className="mt-2 flex flex-col gap-3">
            {review.gaps.map((gap) => (
              <li key={gap.text} className="flex gap-2.5 text-[0.9375rem]">
                <CircleDashed className="mt-0.5 size-4 shrink-0 text-fit-stretch" aria-hidden />
                <span>
                  <span className="font-medium">{sentence(gap.text)}</span>
                  <span className="block text-ink-2">{gap.tip}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-7 border-t border-line pt-5">
        <Button className="w-full" variant="tape" icon={<Scissors className="size-4" />} disabled>
          Tailor my application
        </Button>
        <p className="mt-2 text-center text-[0.8125rem] text-ink-3">
          Tailored resumes and cover letters arrive in the next build of Tailr.
        </p>
      </div>
    </section>
  );
}
