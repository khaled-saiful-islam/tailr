import { ArrowRight, PartyPopper } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useMomentum, type Momentum } from "../api";
import { GoalDialog } from "./GoalDialog";
import { StreakCard } from "./StreakCard";

const EASE = [0.22, 1, 0.36, 1] as const;

/** This week at a glance: applications against your goal, and your brief streak. */
export function MomentumStrip() {
  const momentum = useMomentum();
  if (!momentum.data) return null;
  return (
    <section
      aria-label="Your momentum"
      className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
    >
      <GoalCard momentum={momentum.data} />
      <StreakCard streak={momentum.data.streak} />
    </section>
  );
}

function daysLeftLabel(days: number): string {
  if (days <= 1) return "Last day of the week";
  return `${days} days left this week`;
}

function GoalCard({ momentum }: { momentum: Momentum }) {
  const { target, done, days_left } = momentum.goal;
  const reduce = useReducedMotion();
  const [editing, setEditing] = useState(false);
  const met = done >= target;
  // One stitch per application aimed for; extra applications past the goal add stitches.
  const stitches = Math.max(target, done);

  return (
    <div className="flex flex-col rounded-panel border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="type-figure text-[2.5rem] leading-none">{done}</span>
        <span className="text-[1.0625rem] text-ink-2">
          of {target} {target === 1 ? "application" : "applications"} this week
        </span>
      </div>

      <div
        role="img"
        aria-label={`${done} of ${target} applications sent this week`}
        className={cn(
          "mt-4 flex",
          stitches > 25 ? "gap-0.5" : stitches > 10 ? "gap-1" : "gap-1.5",
        )}
      >
        {Array.from({ length: stitches }, (_, index) => {
          const filled = index < done;
          return (
            <motion.span
              key={index}
              aria-hidden
              className={cn(
                "block h-2.5 min-w-0 flex-1 rounded-full",
                filled
                  ? met
                    ? "bg-fit-strong"
                    : "bg-tape"
                  : "border border-dashed border-line-strong",
              )}
              initial={reduce || !filled ? false : { scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.35, delay: index * 0.07, ease: EASE }}
              style={{ originX: 0 }}
            />
          );
        })}
      </div>

      {met ? (
        <motion.p
          className="mt-4 flex items-center gap-2 font-semibold text-fit-strong"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: stitches * 0.07, ease: EASE }}
        >
          <PartyPopper className="size-4.5 shrink-0" aria-hidden />
          Goal met. Every one past this is a bonus.
        </motion.p>
      ) : (
        <p className="mt-4 text-[0.9375rem] text-ink-2">
          {daysLeftLabel(days_left)}.{" "}
          {done === 0
            ? "Tailor a job you like and send it."
            : `${target - done} more to reach your goal.`}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-4">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Change goal
        </Button>
        <Link
          to="/tracker"
          className="inline-flex h-8 items-center gap-1.5 rounded-control px-3 text-[0.8125rem] font-semibold text-chalk hover:bg-surface-2"
        >
          Open tracker <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <GoalDialog open={editing} onOpenChange={setEditing} current={target} />
    </div>
  );
}
