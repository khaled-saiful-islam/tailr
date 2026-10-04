/** What Home says about the latest job search, in plain words. Pure, so it's testable. */
import type { Brief, Match } from "@/features/brief/api";

type Stats = Record<string, number | boolean | undefined>;

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "today", "yesterday", or "on Friday". */
export function whenLabel(iso: string, now = new Date()): string {
  const then = new Date(iso);
  if (sameDay(then, now)) return "today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(then, yesterday)) return "yesterday";
  return `on ${new Intl.DateTimeFormat("en-MY", { weekday: "long" }).format(then)}`;
}

/** "Monday 7:00 am": when the next daily job update runs. */
export function nextUpdateLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** How many of the latest search's jobs are good matches (at or above the minimum). */
export function goodMatches(brief: Brief): number {
  const stats = brief.stats as Stats;
  if (typeof stats.good === "number") return stats.good;
  // Searches from before the count was kept: they only saved good matches.
  return stats.below_bar ? 0 : brief.matches.length;
}

/** The one sentence under the greeting. */
export function statusLine(
  brief: Brief | null | undefined,
  next: string | null,
  now = new Date(),
): string {
  if (!brief)
    return "You're all set up. Find your first jobs now, or wait for tomorrow morning's update.";
  if (brief.status === "building")
    return "Tailr is searching LinkedIn and JobStreet for new jobs in the background.";
  if (brief.status === "failed")
    return "The last job search didn't finish. Try again in a moment.";
  const count = brief.matches.length;
  const when = whenLabel(brief.finished_at ?? brief.created_at, now);
  if (count === 0)
    return `No new jobs since the last search. Tailr looks again${next ? ` ${next}` : " tomorrow morning"}.`;
  const jobs = count === 1 ? "1 new job" : `${count} new jobs`;
  const good = goodMatches(brief);
  if (good === 0)
    return `Tailr found ${jobs} ${when}, but none is a strong match yet. Have a look, or widen your preferences.`;
  const matches =
    good === count && count > 1
      ? "All of them are good matches."
      : good === 1
        ? "1 is a good match."
        : `${good} are good matches.`;
  return `Tailr found ${jobs} ${when}. ${matches}`;
}

/** "Latest search: 59 jobs looked at, 16 new, 13 kept". Null when there's nothing to say. */
export function searchLine(brief: Brief): string | null {
  const stats = brief.stats as Stats;
  const parts = [
    typeof stats.found === "number" ? `${stats.found} jobs looked at` : null,
    typeof stats.new === "number" ? `${stats.new} new` : null,
    `${brief.matches.length} added to your Jobs page`,
  ].filter(Boolean);
  return parts.length > 1 ? `Latest search: ${parts.join(", ")}.` : null;
}

/** One line on why a job suits you: the AI's take, or the skills you share. */
export function whyLine(match: Match): string | null {
  if (match.review.headline) return match.review.headline;
  const skills = match.review.matched.slice(0, 3);
  return skills.length ? `You have ${skills.join(", ")}.` : null;
}
