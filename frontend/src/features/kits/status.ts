import type { Kit } from "./api";

/** True once the application is marked as sent (or went further). */
export function isApplied(kit: Kit): boolean {
  const stage = kit.application?.stage;
  return Boolean(stage && !["saved", "preparing"].includes(stage));
}

/** Kits made before skills were reported separately keep them among the issues. */
export function splitIssues(check: NonNullable<Kit["fact_check"]>) {
  const issues = (check.issues ?? []).filter((i) => i.where !== "Skills");
  const skillsRemoved = [
    ...(check.skills_removed ?? []),
    ...(check.issues ?? [])
      .filter((i) => i.where === "Skills")
      .map((i) => i.original),
  ];
  return { issues, skillsRemoved };
}

/** One line on why the application can be trusted. */
export function trustSummary(kit: Kit): string {
  const parts: string[] = [];
  if (kit.fact_check) {
    const fixed = splitIssues(kit.fact_check).issues.length;
    parts.push(
      `Every line comes from your profile (${kit.fact_check.lines_checked} checked${fixed ? `, ${fixed} fixed` : ""}).`,
    );
  }
  if (kit.keywords) {
    const { before, after } = kit.keywords;
    parts.push(
      after > before
        ? `It uses ${after}% of the skills the ad asks for, up from ${before}%.`
        : `It uses ${after}% of the skills the ad asks for.`,
    );
  }
  return parts.join(" ");
}
