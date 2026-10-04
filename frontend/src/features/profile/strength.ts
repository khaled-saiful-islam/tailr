/** Profile strength wording and navigation helpers. */

export function strengthWord(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Getting there";
  return "Just started";
}

export function scrollToSection(id: string): void {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
