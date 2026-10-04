/** Match-score bands used everywhere a Fit % appears. */

export type FitLevel = "strong" | "good" | "stretch" | "low";

export function fitLevel(score: number): FitLevel {
  if (score >= 85) return "strong";
  if (score >= 70) return "good";
  if (score >= 50) return "stretch";
  return "low";
}

export const fitLabel: Record<FitLevel, string> = {
  strong: "Strong fit",
  good: "Good fit",
  stretch: "Stretch",
  low: "Long shot",
};
