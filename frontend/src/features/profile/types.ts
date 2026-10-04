/**
 * Profile document types for editing.
 *
 * The API schema marks defaulted fields optional; the editor works on a fully
 * populated copy (`normalize`) so components never juggle `undefined`.
 */
import type { Schemas } from "@/lib/api/client";

export type SkillCategory = "technical" | "tool" | "domain" | "soft";
export type SkillLevel = "learning" | "working" | "strong" | "expert";
export type EmploymentType =
  "full_time" | "part_time" | "contract" | "internship" | "freelance";
export type LanguageLevel =
  "native" | "fluent" | "professional" | "conversational" | "basic";

export interface YearMonth {
  year: number;
  month: number | null;
}
export interface Bullet {
  id: string;
  text: string;
}
export interface Link {
  id: string;
  label: string;
  url: string;
}
export interface Basics {
  full_name: string | null;
  headline: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  links: Link[];
}
export interface Experience {
  id: string;
  title: string;
  company: string;
  location: string | null;
  employment_type: EmploymentType | null;
  start: YearMonth | null;
  end: YearMonth | null;
  current: boolean;
  summary: string | null;
  bullets: Bullet[];
}
export interface Education {
  id: string;
  institution: string;
  qualification: string | null;
  field: string | null;
  start_year: number | null;
  end_year: number | null;
  grade: string | null;
  details: string | null;
}
export interface Project {
  id: string;
  name: string;
  role: string | null;
  url: string | null;
  summary: string | null;
  bullets: Bullet[];
}
export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel | null;
}
export interface Certification {
  id: string;
  name: string;
  issuer: string | null;
  issued: YearMonth | null;
  url: string | null;
}
export interface Language {
  id: string;
  name: string;
  proficiency: LanguageLevel | null;
}
export interface ProfileDoc {
  basics: Basics;
  experiences: Experience[];
  education: Education[];
  projects: Project[];
  skills: Skill[];
  certifications: Certification[];
  languages: Language[];
}

export type ApiProfileDoc = Schemas["ProfileDocument"];
export type ProfileOut = Schemas["ProfileOut"];
export type StrengthOut = Schemas["StrengthOut"];
export type ImportOut = Schemas["ImportOut"];
export type BulletIssue = Schemas["BulletIssueOut"]["issues"][number];

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

const ym = (
  value: { year: number; month?: number | null } | null | undefined,
): YearMonth | null =>
  value ? { year: value.year, month: value.month ?? null } : null;

const bullets = (
  items: { id?: string; text: string }[] | undefined,
): Bullet[] =>
  (items ?? []).map((b) => ({ id: b.id ?? newId(), text: b.text }));

/** Fill every optional field so the editor always has a complete document. */
export function normalize(doc: ApiProfileDoc | undefined): ProfileDoc {
  const basics = doc?.basics;
  return {
    basics: {
      full_name: basics?.full_name ?? null,
      headline: basics?.headline ?? null,
      email: basics?.email ?? null,
      phone: basics?.phone ?? null,
      location: basics?.location ?? null,
      summary: basics?.summary ?? null,
      links: (basics?.links ?? []).map((l) => ({
        id: l.id ?? newId(),
        label: l.label,
        url: l.url,
      })),
    },
    experiences: (doc?.experiences ?? []).map((e) => ({
      id: e.id ?? newId(),
      title: e.title,
      company: e.company,
      location: e.location ?? null,
      employment_type: e.employment_type ?? null,
      start: ym(e.start),
      end: ym(e.end),
      current: e.current ?? false,
      summary: e.summary ?? null,
      bullets: bullets(e.bullets),
    })),
    education: (doc?.education ?? []).map((e) => ({
      id: e.id ?? newId(),
      institution: e.institution,
      qualification: e.qualification ?? null,
      field: e.field ?? null,
      start_year: e.start_year ?? null,
      end_year: e.end_year ?? null,
      grade: e.grade ?? null,
      details: e.details ?? null,
    })),
    projects: (doc?.projects ?? []).map((p) => ({
      id: p.id ?? newId(),
      name: p.name,
      role: p.role ?? null,
      url: p.url ?? null,
      summary: p.summary ?? null,
      bullets: bullets(p.bullets),
    })),
    skills: (doc?.skills ?? []).map((s) => ({
      id: s.id ?? newId(),
      name: s.name,
      category: s.category,
      level: s.level ?? null,
    })),
    certifications: (doc?.certifications ?? []).map((c) => ({
      id: c.id ?? newId(),
      name: c.name,
      issuer: c.issuer ?? null,
      issued: ym(c.issued),
      url: c.url ?? null,
    })),
    languages: (doc?.languages ?? []).map((l) => ({
      id: l.id ?? newId(),
      name: l.name,
      proficiency: l.proficiency ?? null,
    })),
  };
}

/**
 * The document as the API should receive it: empty strings become null and
 * half-filled items (a role without a company yet) stay out until complete.
 */
export function toApi(doc: ProfileDoc): ApiProfileDoc {
  const clean = (value: string | null) =>
    value && value.trim() ? value.trim() : null;
  const filled = (b: Bullet) => b.text.trim().length > 0;
  return {
    basics: {
      ...doc.basics,
      full_name: clean(doc.basics.full_name),
      headline: clean(doc.basics.headline),
      email: clean(doc.basics.email),
      phone: clean(doc.basics.phone),
      location: clean(doc.basics.location),
      summary: clean(doc.basics.summary),
      links: doc.basics.links
        .filter((l) => l.url.trim())
        .map((l) => ({ ...l, label: l.label.trim() || "Link" })),
    },
    experiences: doc.experiences
      .filter((e) => e.title.trim() && e.company.trim())
      .map((e) => ({
        ...e,
        location: clean(e.location),
        summary: clean(e.summary),
        bullets: e.bullets.filter(filled),
      })),
    education: doc.education
      .filter((e) => e.institution.trim())
      .map((e) => ({
        ...e,
        qualification: clean(e.qualification),
        field: clean(e.field),
        grade: clean(e.grade),
        details: clean(e.details),
      })),
    projects: doc.projects
      .filter((p) => p.name.trim())
      .map((p) => ({
        ...p,
        role: clean(p.role),
        url: clean(p.url),
        summary: clean(p.summary),
        bullets: p.bullets.filter(filled),
      })),
    skills: doc.skills.filter((s) => s.name.trim()),
    certifications: doc.certifications
      .filter((c) => c.name.trim())
      .map((c) => ({ ...c, issuer: clean(c.issuer), url: clean(c.url) })),
    languages: doc.languages.filter((l) => l.name.trim()),
  };
}

export const emptyExperience = (): Experience => ({
  id: newId(),
  title: "",
  company: "",
  location: null,
  employment_type: null,
  start: null,
  end: null,
  current: false,
  summary: null,
  bullets: [],
});

export const emptyEducation = (): Education => ({
  id: newId(),
  institution: "",
  qualification: null,
  field: null,
  start_year: null,
  end_year: null,
  grade: null,
  details: null,
});

export const emptyProject = (): Project => ({
  id: newId(),
  name: "",
  role: null,
  url: null,
  summary: null,
  bullets: [],
});

export const emptyCertification = (): Certification => ({
  id: newId(),
  name: "",
  issuer: null,
  issued: null,
  url: null,
});

export const emptyLanguage = (): Language => ({
  id: newId(),
  name: "",
  proficiency: null,
});

export const skillCategoryLabel: Record<SkillCategory, string> = {
  technical: "Technical",
  tool: "Tools and platforms",
  domain: "Industry knowledge",
  soft: "Working with people",
};

export const skillLevelLabel: Record<SkillLevel, string> = {
  learning: "Learning",
  working: "Working",
  strong: "Strong",
  expert: "Expert",
};

export const employmentTypeLabel: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

export const languageLevelLabel: Record<LanguageLevel, string> = {
  native: "Native",
  fluent: "Fluent",
  professional: "Professional",
  conversational: "Conversational",
  basic: "Basic",
};

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

export function formatYearMonth(value: YearMonth | null): string {
  if (!value) return "";
  return value.month
    ? `${MONTHS[value.month - 1]} ${value.year}`
    : String(value.year);
}

export function formatRange(
  start: YearMonth | null,
  end: YearMonth | null,
  current: boolean,
): string {
  const from = formatYearMonth(start);
  const to = current ? "Present" : formatYearMonth(end);
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

export const monthNames = MONTHS;
