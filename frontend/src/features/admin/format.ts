/** Plain words and friendly numbers for the admin panel. */

/** 950, 12.3k, 1.5M: short enough for a figure, exact enough to compare. */
export function compact(value: number): string {
  const abs = Math.abs(value);
  const round = (n: number) => {
    const fixed = n >= 100 ? n.toFixed(0) : n.toFixed(1);
    return fixed.replace(/\.0$/, "");
  };
  if (abs >= 1_000_000_000) return `${round(value / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${round(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${round(value / 1_000)}k`;
  return String(value);
}

/** Every digit, grouped: for places where the exact number matters. */
export function exact(value: number): string {
  return new Intl.NumberFormat("en-MY").format(value);
}

const PURPOSES: Record<string, string> = {
  "kits.tailor": "Tailoring",
  "kits.letter": "Cover letters",
  "kits.extras": "Answers and interview prep",
  "kits.judge": "Fact checks",
  "kits.translate": "Translations",
  "matching.review": "Fit reviews",
  "jobs.insights": "Reading job ads",
  "jobs.embed": "Job search index",
  "radar.relevance": "Relevance checks",
  "radar.suggest": "Radar suggestions",
  "cv.improve": "CV edits",
  "profile.extract": "CV imports",
  "profile.ocr": "Reading scanned CVs",
  "profile.coach": "Bullet Coach",
  "profile.summary": "Profile summaries",
  "profile.embed": "Profile search index",
  "portfolio.draft": "Portfolio drafts",
  "portfolio.judge": "Portfolio checks",
  "public.highlights": "Portfolio highlights",
  "tracker.follow_up": "Follow-up drafts",
};

/** "kits.tailor" → "Tailoring"; unknown keys read as themselves. */
export function purposeLabel(key: string): string {
  return PURPOSES[key] ?? key;
}

const SOURCES: Record<string, string> = {
  linkedin: "LinkedIn",
  jobstreet: "JobStreet",
  indeed: "Indeed",
  glassdoor: "Glassdoor",
  manual: "Added by hand",
};

export function sourceLabel(key: string): string {
  return SOURCES[key] ?? key;
}

/** How much of a daily budget is used, 0 to 1. A budget of 0 means unlimited. */
export function share(used: number, budget: number): number {
  if (budget <= 0) return 0;
  return Math.min(used / budget, 1);
}

/** A source needs a look when a third of its runs fail or come back empty. */
export function sourceTone(source: {
  runs: number;
  failed: number;
  empty: number;
}): "good" | "warn" | "bad" {
  if (source.runs === 0) return "warn";
  if (source.failed / source.runs >= 0.34) return "bad";
  if ((source.failed + source.empty) / source.runs >= 0.34) return "warn";
  return "good";
}

/** "15 Sep": the short day label under each bar. */
export function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${iso}T12:00:00`));
}
