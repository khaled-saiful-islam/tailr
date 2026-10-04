/** Match-score bands used everywhere a match % appears. */

export type FitLevel = "strong" | "good" | "stretch" | "low";

export function fitLevel(score: number): FitLevel {
  if (score >= 85) return "strong";
  if (score >= 70) return "good";
  if (score >= 50) return "stretch";
  return "low";
}

export const fitLabel: Record<FitLevel, string> = {
  strong: "Great match",
  good: "Good match",
  stretch: "Partial match",
  low: "Weak match",
};

/** What a match % means, in one sentence, wherever one needs explaining. */
export const MATCH_MEANING =
  "How well this job suits you, based on your skills, job title, years of experience, location and work mode, and pay.";
