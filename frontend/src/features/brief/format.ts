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
  role: "Role",
  experience: "Experience",
  location: "Location",
  pay: "Pay",
  similarity: "Overall similarity",
};

export const PART_ORDER = [
  "skills",
  "role",
  "experience",
  "location",
  "pay",
  "similarity",
] as const;
