import type { PageExperience, PublicPage, Section } from "./types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2023-03" → "Mar 2023"; "2020" → "2020". */
export function monthYear(value: string | null | undefined): string | null {
  if (!value) return null;
  const [year, month] = value.split("-");
  const index = month ? Number(month) - 1 : -1;
  return index >= 0 && index < 12 ? `${MONTHS[index]} ${year}` : (year ?? null);
}

/** "Mar 2023 – Present", "2018 – 2020", "2021". */
export function dateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  current = false,
): string {
  const from = monthYear(start);
  const to = current ? "Present" : monthYear(end);
  if (from && to) return from === to ? from : `${from} – ${to}`;
  return from ?? to ?? "";
}

export function yearRange(
  start: number | null | undefined,
  end: number | null | undefined,
): string {
  if (start && end) return start === end ? `${end}` : `${start} – ${end}`;
  return `${start ?? end ?? ""}`;
}

export function startYear(role: PageExperience): string {
  return role.start?.slice(0, 4) ?? "";
}

export function availabilityText(page: PublicPage): string | null {
  if (page.availability === "not_looking") return null;
  const base =
    page.availability === "open"
      ? "Open to new roles"
      : "Open to the right role";
  return page.availability_note ? `${base}: ${page.availability_note}` : base;
}

export const SKILL_LABEL: Record<string, string> = {
  technical: "Technical",
  tool: "Tools",
  domain: "Domain",
  soft: "Ways of working",
};

export function shows(page: PublicPage, section: Section): boolean {
  if (page.hidden_sections.includes(section)) return false;
  switch (section) {
    case "highlights":
      return page.highlights.length > 0;
    case "projects":
      return page.projects.length > 0;
    case "experience":
      return page.experiences.length > 0;
    case "education":
      return page.education.length > 0;
    case "certifications":
      return page.certifications.length > 0;
    case "skills":
      return page.skills.length > 0;
    case "languages":
      return page.languages.length > 0;
    default:
      return true;
  }
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "T"
  );
}

export function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The current role, or the most recent one. */
export function currentRole(page: PublicPage): PageExperience | undefined {
  return page.experiences.find((role) => role.current) ?? page.experiences[0];
}

export function yearsOfWork(page: PublicPage): number | null {
  const years = page.experiences
    .map((role) => Number(role.start?.slice(0, 4)))
    .filter((year) => Number.isFinite(year) && year > 1950);
  if (!years.length) return null;
  return Math.max(1, new Date().getFullYear() - Math.min(...years));
}
