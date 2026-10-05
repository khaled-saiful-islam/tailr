/** A two-minute answer timer: most spoken answers should land inside it. */
import { Pause, Play, RotateCcw, Timer as TimerIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TimerState } from "./useTimer";

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function Timer({ timer }: { timer: TimerState }) {
  const done = timer.left === 0;
  const Icon = timer.running ? Pause : done ? RotateCcw : Play;
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.875rem] font-semibold tabular-nums",
          done
            ? "bg-pin-soft text-pin"
            : timer.left <= 20 && timer.running
              ? "bg-[color-mix(in_oklab,var(--fit-stretch)_15%,transparent)] text-fit-stretch"
              : "bg-surface-2 text-ink-2",
        )}
      >
        <TimerIcon className="size-3.5" aria-hidden />
        <span aria-live={done ? "assertive" : "off"}>
          {done ? "Time's up" : clock(timer.left)}
        </span>
      </span>
      <button
        type="button"
        onClick={timer.toggle}
        aria-keyshortcuts="T"
        aria-label={
          timer.running
            ? "Pause the timer"
            : done
              ? "Restart the timer"
              : "Start a two-minute timer"
        }
        className="grid size-9 place-items-center rounded-full border border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink"
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
