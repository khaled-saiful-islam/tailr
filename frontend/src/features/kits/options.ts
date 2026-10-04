import type { Language, Tone } from "./api";

export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ms", label: "Bahasa Malaysia" },
];

export const TONE_OPTIONS: { value: Tone; label: string; hint: string }[] = [
  {
    value: "confident",
    label: "Confident",
    hint: "Direct, leads with results",
  },
  {
    value: "warm",
    label: "Warm",
    hint: "Friendly, shows why you care about the work",
  },
  { value: "concise", label: "Concise", hint: "Short and to the point" },
];

/** The build stages, in the order the server runs them. */
export const STAGES: { key: string; label: string; detail: string }[] = [
  {
    key: "reading",
    label: "Reading the job ad",
    detail: "What they're asking for, in their own words",
  },
  {
    key: "tailoring",
    label: "Writing your CV and cover letter",
    detail: "Plus answers to common questions and interview prep",
  },
  {
    key: "checking",
    label: "Checking every line",
    detail: "Each line is checked against your profile",
  },
];

export function stageIndex(stage: string): number {
  if (stage === "done") return STAGES.length;
  return Math.max(
    0,
    STAGES.findIndex((s) => s.key === stage),
  );
}

/** "LinkedIn", "JobStreet", or a plain fallback, from the job's address. */
export function siteName(url: string): string {
  if (/linkedin\./i.test(url)) return "LinkedIn";
  if (/jobstreet\./i.test(url)) return "JobStreet";
  return "the job site";
}
