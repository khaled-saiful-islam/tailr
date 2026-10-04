import { motion } from "motion/react";
import type { Momentum } from "@/features/momentum/api";
import { PATH, STAGE_LABEL } from "../stages";

/** How far applications got: each stage, its share of everything saved, and what moved on. */
export function Funnel({ funnel }: { funnel: Momentum["funnel"] }) {
  const total = Math.max(funnel.saved, 1);
  return (
    <section aria-labelledby="funnel-heading">
      <h2 id="funnel-heading" className="sr-only">
        How far your applications got
      </h2>
      <ol className="grid grid-cols-3 gap-x-4 gap-y-4 sm:gap-x-5 sm:gap-y-5 lg:grid-cols-5">
        {PATH.map((stage, index) => {
          const count = funnel[stage];
          const previous = index > 0 ? PATH[index - 1]! : null;
          const before = previous ? funnel[previous] : 0;
          const note = !previous
            ? "Every job you're going for"
            : before
              ? `${Math.round((count / before) * 100)}% of ${STAGE_LABEL[previous].toLowerCase()}`
              : "None yet";
          return (
            <li key={stage}>
              <p className="text-[0.875rem] text-ink-2">{STAGE_LABEL[stage]}</p>
              <p className="type-figure mt-0.5 text-[1.75rem] leading-none">
                {count}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className="h-full rounded-full bg-ink"
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / total) * 100}%` }}
                  transition={{
                    duration: 0.7,
                    delay: index * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              </div>
              <p className="mt-1.5 hidden text-[0.8125rem] text-ink-3 sm:block">
                {note}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
