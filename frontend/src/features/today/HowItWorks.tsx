import { FileText, KanbanSquare, Search, Target } from "lucide-react";
import { motion } from "motion/react";
import { MatchBadge } from "./BestMatches";

const STEPS = [
  {
    icon: Search,
    title: "Find",
    body: "Every morning Tailr searches LinkedIn and JobStreet for the jobs you want.",
  },
  {
    icon: Target,
    title: "Match",
    body: "Each job gets a % match: how well it suits your CV and preferences.",
  },
  {
    icon: FileText,
    title: "Prepare",
    body: "For a job you like, Tailr writes a CV and cover letter from your real experience.",
  },
  {
    icon: KanbanSquare,
    title: "Track",
    body: "Keep every application in one place, with a reminder to follow up.",
  },
];

const EXAMPLE_JOBS = [
  {
    title: "Senior AI Engineer",
    company: "Selat Pay, Kuala Lumpur",
    score: 92,
  },
  {
    title: "ML Platform Engineer",
    company: "Hijau Energy, Cyberjaya",
    score: 86,
  },
  { title: "Data Scientist", company: "Rimba Health, Penang", score: 71 },
];

/** Four steps, one line each: what Tailr does for you. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading">
      <h2 id="how-heading" className="type-heading">
        How Tailr works
      </h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {STEPS.map((step, index) => (
          <motion.li
            key={step.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + index * 0.06, duration: 0.4 }}
            className="flex gap-3 rounded-panel border border-line bg-surface p-4"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
              <step.icon className="size-[18px]" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold">{step.title}</span>
              <span className="mt-0.5 block text-[0.9375rem] leading-snug text-ink-2">
                {step.body}
              </span>
            </span>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

/** What the Jobs page will look like, clearly marked as an example. */
export function ExampleJobs() {
  return (
    <section aria-labelledby="example-heading">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="example-heading" className="type-heading">
          Your Jobs page will look like this
        </h2>
        <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[0.75rem] font-semibold text-ink-2">
          Example
        </span>
      </div>
      <ul className="mt-4 overflow-hidden rounded-panel border border-line bg-surface">
        {EXAMPLE_JOBS.map((job) => (
          <li
            key={job.title}
            className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-t border-line p-4 first:border-t-0"
          >
            <span className="min-w-[min(100%,12rem)] flex-1">
              <span className="block font-semibold">{job.title}</span>
              <span className="block text-[0.875rem] text-ink-2">
                {job.company}
              </span>
            </span>
            <MatchBadge score={job.score} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[0.875rem] text-ink-3">
        Yours will show real jobs, matched to your own CV.
      </p>
    </section>
  );
}
