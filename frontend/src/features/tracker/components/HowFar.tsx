import { motion } from "motion/react";
import type { Momentum } from "@/features/momentum/api";
import { progressSentence } from "../next";

const STEPS = [
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interviews" },
  { key: "offer", label: "Offers" },
] as const;

/**
 * How far applications got, told as a sentence first. These count every job that ever
 * reached a step, so they're not the same as the columns, and the card says so.
 */
export function HowFar({ funnel }: { funnel: Momentum["funnel"] }) {
  const total = Math.max(funnel.saved, 1);
  return (
    <section
      aria-labelledby="how-far-heading"
      className="rounded-panel border border-line bg-surface p-5 sm:p-6"
    >
      <h2 id="how-far-heading" className="type-heading">
        How far you've got
      </h2>
      <p className="mt-2 max-w-[44rem] text-ink-2">
        {progressSentence(funnel)}
      </p>
      <ol className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
        {STEPS.map(({ key, label }, index) => {
          const count = funnel[key];
          return (
            <li key={key}>
              <p className="flex items-baseline justify-between gap-2 text-[0.875rem] text-ink-2">
                {label}
                <span className="type-figure text-[1.375rem] leading-none text-ink">
                  {count}
                </span>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className="h-full rounded-full bg-ink"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(count / total) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-[0.8125rem] text-ink-3">
        Every job that ever got this far, including ones that moved on, so these
        numbers can be bigger than the columns above.
      </p>
    </section>
  );
}
