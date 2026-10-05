import type { Match } from "./api";

const SOURCE_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  jobstreet: "JobStreet",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source;
}

/** "Petaling Jaya, Selangor, Malaysia" → "Petaling Jaya". */
export function placeLabel(location: string | null | undefined): string | null {
  if (!location) return null;
  const first = location.split(",")[0] ?? "";
  return (
    first
      .replace(/^(WP\.|Federal Territory of|Wilayah Persekutuan)\s*/i, "")
      .trim() || null
  );
}

/** "No Rust experience." → "No Rust experience" (so we can add our own punctuation). */
export function sentence(text: string): string {
  return text.trim().replace(/[.!\s]+$/, "");
}

export function payLabel(job: Match["job"]): string | null {
  if (job.salary_min && job.salary_max) {
    return job.salary_min === job.salary_max
      ? `RM ${job.salary_min.toLocaleString("en-MY")} a month`
      : `RM ${job.salary_min.toLocaleString("en-MY")} to ${job.salary_max.toLocaleString("en-MY")} a month`;
  }
  return job.salary_text ?? null;
}

export const WORK_MODE: Record<string, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

export const PART_LABEL: Record<string, string> = {
  skills: "Skills",
  role: "Job title",
  experience: "Experience",
  location: "Location and work mode",
  pay: "Pay",
  similarity: "Overall",
};

export const PART_ORDER = [
  "skills",
  "role",
  "experience",
  "location",
  "pay",
  "similarity",
] as const;

const DAY_MS = 86_400_000;

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

/**
 * When the job reached your list: "Found today", "Found yesterday", "Found 3 days ago".
 * Jobs you added yourself say "Added". Counts calendar days, as people do.
 */
export function foundLabel(
  match: Pick<Match, "created_at" | "origin">,
  now: Date = new Date(),
): string {
  const verb = match.origin === "pasted" ? "Added" : "Found";
  const days = Math.round(
    (startOfDay(now) - startOfDay(new Date(match.created_at))) / DAY_MS,
  );
  if (days <= 0) return `${verb} today`;
  if (days === 1) return `${verb} yesterday`;
  return `${verb} ${days} days ago`;
}
