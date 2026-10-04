/** What the portfolio sections show, derived from the page data. */
import { dateRange, monthYear, shows, yearsOfWork } from "../format";
import type { PageProject, PublicPage, Section } from "../types";

export interface TimelineItem {
  kind: "role" | "education";
  title: string;
  org: string;
  period: string;
  sortKey: string;
  current: boolean;
  lines: string[];
}

/** Roles and studies in one line of time, newest first. */
export function timeline(page: PublicPage): TimelineItem[] {
  const roles: TimelineItem[] = page.experiences.map((role) => ({
    kind: "role",
    title: role.title,
    org: [role.company, role.location].filter(Boolean).join(", "),
    period: dateRange(role.start, role.end, role.current),
    sortKey: role.current ? "9999" : (role.end ?? role.start ?? ""),
    current: role.current,
    lines: role.bullets.slice(0, 2),
  }));
  const studies: TimelineItem[] = page.hidden_sections.includes("education")
    ? []
    : page.education.map((item) => ({
        kind: "education",
        title:
          [item.qualification, item.field].filter(Boolean).join(", ") ||
          item.institution,
        org: item.qualification || item.field ? item.institution : "",
        period: [item.start_year, item.end_year].filter(Boolean).join(" – "),
        sortKey: String(item.end_year ?? item.start_year ?? ""),
        current: false,
        lines: item.grade ? [item.grade] : [],
      }));
  return [...roles, ...studies].sort((a, b) =>
    b.sortKey.localeCompare(a.sortKey),
  );
}

export interface QuickFact {
  label: string;
  value: string;
}

export function quickFacts(page: PublicPage): QuickFact[] {
  const years = yearsOfWork(page);
  const study = page.education[0];
  const facts: (QuickFact | null)[] = [
    page.location ? { label: "Based in", value: page.location } : null,
    years ? { label: "Experience", value: `${years}+ years` } : null,
    page.languages.length
      ? {
          label: "Languages",
          value: page.languages.map((l) => l.name).join(", "),
        }
      : null,
    study
      ? {
          label: "Studied",
          value: [study.qualification || study.field, study.institution]
            .filter(Boolean)
            .join(", "),
        }
      : null,
  ];
  return facts.filter((fact): fact is QuickFact => fact !== null);
}

/** Achievements: chosen numbers, awards and certifications, in that order. */
export function hasAchievements(page: PublicPage): boolean {
  return (
    page.highlights.length + page.awards.length + page.certifications.length >
      0 && !page.hidden_sections.includes("achievements")
  );
}

export function visible(page: PublicPage, section: Section): boolean {
  if (page.hidden_sections.includes(section)) return false;
  switch (section) {
    case "about":
      return page.about.length > 0 || Boolean(page.summary);
    case "expertise":
      return page.expertise.length > 0;
    case "achievements":
      return hasAchievements(page);
    case "projects":
      return page.projects.length > 0;
    case "experience":
      return page.experiences.length > 0;
    case "testimonials":
      return page.testimonials.length > 0;
    case "contact":
      return (
        page.contact_form ||
        page.has_contact ||
        Boolean(page.whatsapp_url) ||
        page.links.length > 0
      );
    default:
      return true;
  }
}

/** The project's one-line outcome, for cards. */
export function outcome(project: PageProject): string | null {
  return (
    project.case?.outcome ??
    project.case?.overview ??
    project.summary ??
    project.bullets[0] ??
    null
  );
}

export function projectYear(project: PageProject): string | null {
  return project.case?.timeline ?? null;
}

export function lastUpdated(page: PublicPage): string {
  return monthYear(page.updated_at.slice(0, 7)) ?? "";
}

/** The big numbers: chosen highlights, or honest counts from the profile. */
export function figures(page: PublicPage): { value: string; label: string }[] {
  if (shows(page, "highlights")) return page.highlights;
  const skills = page.skills.reduce(
    (sum, group) => sum + group.names.length,
    0,
  );
  const counts = [
    {
      value: String(page.projects.length),
      label: page.projects.length === 1 ? "project" : "projects",
    },
    {
      value: String(page.experiences.length),
      label: page.experiences.length === 1 ? "role" : "roles",
    },
    { value: String(skills), label: "skills" },
    {
      value: String(page.languages.length),
      label: page.languages.length === 1 ? "language" : "languages",
    },
  ];
  return counts.filter((count) => Number(count.value) > 0);
}
