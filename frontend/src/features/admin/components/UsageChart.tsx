import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { compact, dayLabel, exact } from "../format";

interface Day {
  day: string;
  tokens: number;
}

/** Tokens per day for the last two weeks; today's bar is marked. A table reads it aloud. */
export function UsageChart({
  days,
  caption,
  className,
}: {
  days: Day[];
  caption: string;
  className?: string;
}) {
  const peak = Math.max(...days.map((d) => d.tokens), 0);
  const first = days[0];
  return (
    <figure className={className}>
      <div className="flex items-baseline justify-between gap-3 text-[0.8125rem] text-ink-3">
        <figcaption>{caption}</figcaption>
        <span>
          Peak <span className="type-figure text-ink-2">{compact(peak)}</span>
        </span>
      </div>
      <div aria-hidden className="mt-3 flex h-32 items-end gap-1 sm:gap-1.5">
        {days.map((day, index) => {
          const today = index === days.length - 1;
          const height = peak ? Math.max((day.tokens / peak) * 100, 2) : 2;
          return (
            <div
              key={day.day}
              title={`${dayLabel(day.day)}: ${exact(day.tokens)} tokens`}
              className="flex h-full flex-1 items-end"
            >
              <motion.div
                className={cn(
                  "w-full origin-bottom rounded-t-[3px]",
                  today ? "bg-tape" : day.tokens ? "bg-ink" : "bg-surface-3",
                )}
                style={{ height: `${height}%` }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.025,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        aria-hidden
        className="mt-1.5 flex justify-between text-[0.75rem] text-ink-3"
      >
        <span>{first ? dayLabel(first.day) : ""}</span>
        <span>Today</span>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.day}>
              <td>{dayLabel(day.day)}</td>
              <td>{exact(day.tokens)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
