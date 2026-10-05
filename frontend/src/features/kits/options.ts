import type { Language, Tone } from "./api";

export const LANGUAGE_OPTIONS: {
  value: Language;
  label: string;
  short: string;
  hint: string;
}[] = [
  {
    value: "en",
    label: "English",
    short: "EN",
    hint: "Most job ads in Malaysia",
  },
  {
    value: "ms",
    label: "Bahasa Malaysia",
    short: "BM",
    hint: "When the ad is in Malay",
  },
];

export const TONE_OPTIONS: {
  value: Tone;
  label: string;
  hint: string;
  sample: string;
}[] = [
  {
    value: "confident",
    label: "Confident",
    hint: "Direct, leads with results",
    sample: "I led the team that cut serving costs by 38%.",
  },
  {
    value: "warm",
    label: "Warm",
    hint: "Friendly, shows why you care about the work",
    sample: "I'd love to bring the same care to your customers.",
  },
  {
    value: "concise",
    label: "Concise",
    hint: "Short and to the point",
    sample: "Cut serving costs by 38%. Led a team of four.",
  },
];

export function languageName(language: Language): string {
  return LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ?? "English";
}

export function toneName(tone: Tone): string {
  return TONE_OPTIONS.find((o) => o.value === tone)?.label ?? "Confident";
}

/** What the rewrite button says it will do: only the parts that change. */
export function rewriteLabel(
  current: { language: Language; tone: Tone },
  next: { language: Language; tone: Tone },
): string {
  const language = next.language !== current.language;
  const tone = next.tone !== current.tone;
  const toneWords = `${toneName(next.tone).toLowerCase()} tone`;
  if (language && tone)
    return `Rewrite in ${languageName(next.language)}, ${toneWords}`;
  if (language) return `Rewrite in ${languageName(next.language)}`;
  if (tone) return `Rewrite in a ${toneWords}`;
  return "Write it again";
}

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
