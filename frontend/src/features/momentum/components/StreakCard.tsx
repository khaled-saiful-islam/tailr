import { Check, Flame } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Momentum } from "../api";

type Streak = Momentum["streak"];
type DayState = Streak["week"][number]["state"];

const STATE_LABEL: Record<DayState, string> = {
  checked: "you checked your new jobs",
  missed: "not checked",
  off: "no daily update that day",
  today: "today, not checked yet",
  ahead: "still to come",
  before: "before your streak began",
};

function dayName(iso: string, style: "long" | "narrow"): string {
  return new Intl.DateTimeFormat("en-MY", { weekday: style }).format(
    new Date(`${iso}T12:00:00`),
  );
}

function longDay(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${iso}T12:00:00`));
}

function message(streak: Streak): string {
  if (streak.current === 0)
    return "Open Tailr each morning to check your new jobs. Your days in a row add up here.";
  if (streak.checked_today)
    return "You've checked today's jobs. Come back tomorrow to keep it going.";
  return "Check today's new jobs to keep it going.";
}

/** Days in a row you checked your new jobs, and this week day by day. */
export function StreakCard({ streak }: { streak: Streak }) {
  return (
    <div className="flex flex-col rounded-panel border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <Flame
          className={cn(
            "size-6 shrink-0 self-center",
            streak.current > 0 ? "text-tape-deep" : "text-ink-3",
          )}
          aria-hidden
        />
        <span className="type-figure text-[2.5rem] leading-none">
          {streak.current}
        </span>
        <span className="text-[1.0625rem] text-ink-2">
          {streak.current === 1 ? "day" : "days"} in a row
        </span>
      </div>
      <p className="mt-2 text-[0.9375rem] text-ink-2">{message(streak)}</p>

      <ol aria-label="This week" className="mt-4 grid grid-cols-7 gap-1.5">
        {streak.week.map(({ day, state }) => (
          <li key={day} className="flex flex-col items-center gap-1.5">
            <span className="sr-only">
              {longDay(day)}: {STATE_LABEL[state]}
            </span>
            <span aria-hidden className="text-[0.75rem] font-medium text-ink-3">
              {dayName(day, "narrow")}
            </span>
            <DayMark state={state} />
          </li>
        ))}
      </ol>

      <p className="mt-auto pt-4 text-[0.8125rem] text-ink-3">
        Best: {streak.best} {streak.best === 1 ? "day" : "days"}. Days with no
        daily update don't break it.
      </p>
    </div>
  );
}

function DayMark({ state }: { state: DayState }) {
  const base = "grid size-8 place-items-center rounded-full";
  switch (state) {
    case "checked":
      return (
        <span aria-hidden className={cn(base, "bg-fit-strong text-surface")}>
          <Check className="size-4" strokeWidth={3} />
        </span>
      );
    case "today":
      return (
        <span
          aria-hidden
          className={cn(base, "border-2 border-dashed border-tape-deep")}
        />
      );
    case "missed":
      return (
        <span
          aria-hidden
          className={cn(base, "border border-line-strong bg-surface-2")}
        >
          <span className="h-0.5 w-2.5 rounded-full bg-ink-3" />
        </span>
      );
    case "off":
      return (
        <span aria-hidden className={cn(base, "text-[0.75rem] text-ink-3")}>
          off
        </span>
      );
    default:
      return (
        <span
          aria-hidden
          className={cn(base, "border border-dashed border-line")}
        />
      );
  }
}
