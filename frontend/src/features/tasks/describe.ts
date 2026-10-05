/** Plain words for background work, and when to speak up about it. Pure, so it's testable. */
import { relativeTime } from "@/lib/format";
import type { Task } from "./api";

type Status = Task["status"];
export type Seen = ReadonlyMap<string, Status>;

const ACTIVE: ReadonlySet<Status> = new Set<Status>(["queued", "running"]);

/** Work that already sends a notification when it ends, so a second alert would repeat it. */
export const NOTIFIES: ReadonlySet<string> = new Set([
  "job.add",
  "website.draft",
  "applications.follow_up",
  "job.search",
  "application.prepare",
  "cv.read",
  "cv.improve",
  "interview.plan",
]);

/** What a finished alert says, for work that has no notification of its own. */
const WORDS: Record<
  string,
  { done: string; body: string; failed: string } | undefined
> = {
  "preferences.suggest": {
    done: "Job title ideas are ready",
    body: "Open Job preferences to add the ones you want.",
    failed: "Job title ideas didn't finish",
  },
  "preferences.preview": {
    done: "Your quick look at LinkedIn and JobStreet is ready",
    body: "Open Job preferences to see what it found.",
    failed: "The quick look at LinkedIn and JobStreet didn't finish",
  },
  "website.highlights": {
    done: "Key number ideas are ready",
    body: "Open My website to pick the ones you want.",
    failed: "Key number ideas didn't finish",
  },
  "profile.improve_point": {
    done: "A stronger version of your point is ready",
    body: "Open My profile to use it.",
    failed: "Improving your point didn't finish",
  },
  "interview.feedback": {
    done: "Feedback on your answer is ready",
    body: "Open your application's interview prep to read it.",
    failed: "Feedback on your answer didn't finish",
  },
  "profile.summary": {
    done: "Your summary is ready",
    body: "Open My profile to read it.",
    failed: "Your summary didn't finish",
  },
};

export function isFinished(task: Pick<Task, "status">): boolean {
  return !ACTIVE.has(task.status);
}

/**
 * Work that ended since the last look: it was running then, or it's new and already done
 * (quick work can start and end between two looks). The first look reports nothing, so
 * older work doesn't announce itself when the app opens.
 */
export function finishedSince(seen: Seen | null, items: Task[]): Task[] {
  if (seen === null) return [];
  return items.filter((task) => {
    if (!isFinished(task)) return false;
    const before = seen.get(task.id);
    return before === undefined || ACTIVE.has(before);
  });
}

/** The statuses to compare against next time. Keeps what it saw before, so nothing repeats. */
export function remember(seen: Seen | null, items: Task[]): Seen {
  const next = new Map(seen ?? []);
  for (const task of items) next.set(task.id, task.status);
  return next;
}

/** True when the link points at the page already open (the page shows the result itself). */
export function onPage(link: string | null | undefined, pathname: string) {
  if (!link) return false;
  return link.split(/[?#]/)[0] === pathname;
}

/** Speak up only for work without its own notification, and not on the page that shows it. */
export function shouldAlert(task: Task, pathname: string): boolean {
  return !NOTIFIES.has(task.kind) && !onPage(task.link, pathname);
}

export function alertText(task: Task): { title: string; body?: string } {
  const words = WORDS[task.kind];
  if (task.status === "failed")
    return {
      title: words?.failed ?? `${task.title} didn't finish`,
      body: task.error ?? "Something went wrong. Please try again.",
    };
  return words
    ? { title: words.done, body: words.body }
    : { title: "Done", body: task.title };
}

function minutes(ms: number): string {
  const count = Math.floor(ms / 60_000);
  if (count < 1) return "under a minute";
  return count === 1 ? "1 minute" : `${count} minutes`;
}

/** "Running for 2 minutes", "Finished 5 minutes ago". Times never run ahead of now. */
export function timeLine(task: Task, now: number): string {
  if (task.status === "queued") return "Waiting to start";
  const started = new Date(task.created_at).getTime();
  if (task.status === "running")
    return `Running for ${minutes(Math.max(0, now - started))}`;
  const ended = Math.min(
    new Date(task.finished_at ?? task.created_at).getTime(),
    now,
  );
  const when = relativeTime(new Date(ended), new Date(now));
  return task.status === "done" ? `Finished ${when}` : `Stopped ${when}`;
}

/** Running work first, then the newest. */
export function inOrder(items: Task[]): Task[] {
  return [...items].sort((a, b) => {
    const active = Number(isFinished(a)) - Number(isFinished(b));
    if (active !== 0) return active;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}
