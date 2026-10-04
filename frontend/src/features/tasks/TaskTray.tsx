import { Check, CircleAlert, Hourglass } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Spinner } from "@/components/ui/Spinner";
import { isActive, useTaskList, type Task } from "./api";
import { inOrder, timeLine } from "./describe";

function StatusIcon({ task }: { task: Task }) {
  if (isActive(task))
    return (
      <span aria-hidden className="text-ink-2">
        <Spinner className="size-4" />
      </span>
    );
  return task.status === "failed" ? (
    <CircleAlert className="size-4 text-pin" aria-hidden />
  ) : (
    <Check className="size-4 text-ink-2" aria-hidden />
  );
}

const STATUS_WORD: Record<Task["status"], string> = {
  queued: "Waiting",
  running: "Working",
  done: "Done",
  failed: "Didn't finish",
};

function Row({
  task,
  now,
  onOpen,
}: {
  task: Task;
  now: number;
  onOpen: () => void;
}) {
  const active = isActive(task);
  return (
    <li className="flex gap-3 rounded-control px-2.5 py-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface-2">
        <StatusIcon task={task} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-semibold leading-snug">
          <span className="sr-only">{STATUS_WORD[task.status]}: </span>
          {task.title}
        </p>
        {active && task.stage && (
          <p className="mt-0.5 text-[0.875rem] text-ink-2">{task.stage}</p>
        )}
        {task.status === "failed" && task.error && (
          <p className="mt-0.5 text-[0.875rem] text-ink-2">{task.error}</p>
        )}
        <p className="mt-1 text-[0.8125rem] text-ink-3">
          {timeLine(task, now)}
        </p>
      </div>
      {!active && task.link && (
        <Link
          to={task.link}
          onClick={onOpen}
          className="self-center rounded-control px-2 py-1.5 text-[0.875rem] font-semibold text-chalk hover:bg-chalk-soft"
        >
          Open<span className="sr-only">: {task.title}</span>
        </Link>
      )}
    </li>
  );
}

/** Ticks while the list is open, so "Running for 2 minutes" stays true. */
function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, [ticking]);
  return now;
}

/**
 * "Working on it": slow work (job searches, AI writing) runs on the server, and this
 * shows what's running and what just finished, so people can keep using Tailr meanwhile.
 */
export function TaskTray({
  side = "bottom",
  align = "start",
}: {
  side?: "bottom" | "right";
  align?: "start" | "end";
}) {
  const { data } = useTaskList();
  const [open, setOpen] = useState(false);
  const now = useNow(open);
  const running = data?.running ?? 0;
  const items = inOrder(data?.items ?? []);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={
          running
            ? `What Tailr is working on, ${running} running`
            : "What Tailr is working on"
        }
        className="relative grid size-9 shrink-0 place-items-center rounded-[9px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink data-[state=open]:bg-surface-2 data-[state=open]:text-ink"
      >
        {running > 0 ? (
          <span aria-hidden className="text-ink">
            <Spinner className="size-[18px]" />
          </span>
        ) : (
          <Hourglass className="size-[18px]" aria-hidden />
        )}
        {running > 0 && (
          <span
            aria-hidden
            className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-tape px-1 text-[0.625rem] font-bold leading-none text-tape-ink"
          >
            {running > 9 ? "9+" : running}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[min(23rem,calc(100vw-2rem))] animate-pop rounded-panel border border-line bg-surface text-ink shadow-sheet outline-none"
        >
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-semibold">Working on it</h2>
            {running > 0 && (
              <p className="mt-0.5 text-[0.875rem] text-ink-2">
                You can keep using Tailr. We'll tell you when each one is done.
              </p>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-[0.9375rem] text-ink-2">
              Nothing running. Slow work like job searches and AI writing
              happens here, so you can keep using Tailr.
            </p>
          ) : (
            <ul className="max-h-[min(28rem,60vh)] overflow-y-auto p-1.5">
              {items.map((task) => (
                <Row
                  key={task.id}
                  task={task}
                  now={now}
                  onOpen={() => setOpen(false)}
                />
              ))}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
