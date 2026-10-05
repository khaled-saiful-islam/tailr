import { afterEach, describe, expect, it } from "vitest";
import type { Kit } from "../api";
import { rewriteLabel } from "../options";
import { readProgress } from "../progress";
import { isApplied, splitIssues, trustSummary } from "../status";

const kit = (patch: Partial<Kit>): Kit =>
  ({ application: null, fact_check: null, keywords: null, ...patch }) as Kit;

describe("rewriteLabel", () => {
  const now = { language: "en", tone: "confident" } as const;
  it("says only what changes", () => {
    expect(rewriteLabel(now, { language: "ms", tone: "warm" })).toBe(
      "Rewrite in Bahasa Malaysia, warm tone",
    );
    expect(rewriteLabel(now, { language: "ms", tone: "confident" })).toBe(
      "Rewrite in Bahasa Malaysia",
    );
    expect(rewriteLabel(now, { language: "en", tone: "concise" })).toBe(
      "Rewrite in a concise tone",
    );
    expect(rewriteLabel(now, now)).toBe("Write it again");
  });
});

describe("isApplied", () => {
  it("is true once the application went past preparing", () => {
    expect(isApplied(kit({}))).toBe(false);
    for (const stage of ["saved", "preparing"] as const)
      expect(
        isApplied(kit({ application: { stage } as Kit["application"] })),
      ).toBe(false);
    for (const stage of ["applied", "interview", "offer", "rejected"] as const)
      expect(
        isApplied(kit({ application: { stage } as Kit["application"] })),
      ).toBe(true);
  });
});

describe("trust", () => {
  const check = {
    lines_checked: 10,
    issues: [
      { where: "Skills", problem: "", original: "Kafka", replaced_with: null },
      { where: "Selat Pay", problem: "", original: "x", replaced_with: "y" },
    ],
    skills_removed: ["Rust"],
  } as unknown as NonNullable<Kit["fact_check"]>;

  it("keeps old skill issues apart from line fixes", () => {
    const { issues, skillsRemoved } = splitIssues(check);
    expect(issues).toHaveLength(1);
    expect(skillsRemoved).toEqual(["Rust", "Kafka"]);
  });

  it("sums up the check and the keywords in a line", () => {
    const keywords = { before: 63, after: 88 } as NonNullable<Kit["keywords"]>;
    expect(trustSummary(kit({ fact_check: check, keywords }))).toBe(
      "Every line comes from your profile (10 checked, 1 fixed). It uses 88% of the skills the ad asks for, up from 63%.",
    );
    expect(trustSummary(kit({ keywords: { ...keywords, before: 88 } }))).toBe(
      "It uses 88% of the skills the ad asks for.",
    );
  });
});

describe("readProgress", () => {
  afterEach(() => window.localStorage.clear());

  it("starts with nothing ticked and ignores odd saved data", () => {
    expect(readProgress("k1")).toEqual({
      cv: false,
      letter: false,
      site: false,
    });
    window.localStorage.setItem("tailr.application-steps.k1", "not json");
    expect(readProgress("k1")).toEqual({
      cv: false,
      letter: false,
      site: false,
    });
    window.localStorage.setItem(
      "tailr.application-steps.k1",
      JSON.stringify({ cv: true, letter: "yes" }),
    );
    expect(readProgress("k1")).toEqual({
      cv: true,
      letter: false,
      site: false,
    });
  });
});
