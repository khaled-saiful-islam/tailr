/**
 * Background work a screen can come back to. Start new work, or pick up the latest task
 * of the same kind from an earlier visit: still running, or done and not used yet.
 *
 * Which tasks were used ("claimed") and what each task was for ("owner") live in this
 * browser only. If storage is blocked, a result may simply show again; nothing breaks.
 */
import { useState } from "react";
import { isActive, useBackgroundTask, useLatestTask, type Task } from "./api";

const CLAIMED_KEY = "tailr.tasks.claimed";
const OWNERS_KEY = "tailr.tasks.owners";
const REMEMBERED = 40;
const HOUR_MS = 60 * 60 * 1000;

function read<T>(
  key: string,
  fallback: T,
  valid: (value: unknown) => boolean,
): T {
  try {
    const raw = window.localStorage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : fallback;
    return valid(value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or full storage: the screen still works, it just forgets.
  }
}

const isList = (value: unknown) => Array.isArray(value);
const isRecord = (value: unknown) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readClaimed(): string[] {
  return read<string[]>(CLAIMED_KEY, [], isList);
}

/** Remember what a task was started for (a settings key, a line of text). */
export function rememberOwner(taskId: string, owner: string): void {
  const owners = read<Record<string, string>>(OWNERS_KEY, {}, isRecord);
  const kept = Object.entries(owners).slice(-(REMEMBERED - 1));
  write(OWNERS_KEY, Object.fromEntries([...kept, [taskId, owner]]));
}

export function ownerOf(taskId: string): string | undefined {
  return read<Record<string, string>>(OWNERS_KEY, {}, isRecord)[taskId];
}

/** Finished long enough ago that its answer is out of date. */
export function isStale(task: Task, now: number, freshFor: number): boolean {
  return now - Date.parse(task.finished_at ?? task.created_at) > freshFor;
}

interface Options {
  /** Whether a task from an earlier visit belongs here (default: any of the kind). */
  belongs?: (task: Task) => boolean;
  /** How long a finished answer stays worth showing. */
  freshFor?: number;
  /** Also told when starting is refused or the work fails. */
  onFailed?: (message: string) => void;
}

export function useResumableTask<A = void, R = unknown>(
  kind: string,
  start: (args: A) => Promise<Task>,
  { belongs, freshFor = HOUR_MS, onFailed }: Options = {},
) {
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(readClaimed);
  const own = useBackgroundTask<A, R>(start, {
    onFailed: (message) => {
      setError(message);
      onFailed?.(message);
    },
  });
  const latest = useLatestTask(kind);

  const left = latest.data ?? null;
  const startedHere = own.task !== null || own.running;
  const resumed =
    !startedHere &&
    left !== null &&
    !claimed.includes(left.id) &&
    (belongs?.(left) ?? true) &&
    (isActive(left) ||
      (left.status === "done" &&
        !isStale(left, latest.dataUpdatedAt, freshFor)))
      ? left
      : null;
  const task = startedHere ? own.task : resumed;

  return {
    run: (args: A) => {
      setError(null);
      own.run(args);
    },
    task,
    running: own.running || isActive(resumed),
    result: task?.status === "done" ? (task.result as R) : undefined,
    error,
    /** Put the answer away: used, or not wanted. It won't come back. */
    dismiss: () => {
      if (task) {
        const next = [...claimed, task.id].slice(-REMEMBERED);
        setClaimed(next);
        write(CLAIMED_KEY, next);
      }
      own.reset();
      setError(null);
    },
  };
}
