import { describe, expect, it } from "vitest";
import type { Brief, Match } from "@/features/brief/api";
import { searchLine, statusLine, whenLabel, whyLine } from "../status";

// Midday in Kuala Lumpur is the same calendar day in UTC, so this runs anywhere.
const NOW = new Date("2026-10-05T12:00:00+08:00");

function match(score: number, review: Partial<Match["review"]> = {}): Match {
  return {
    id: `m${score}`,
    score,
    parts: {},
    status: "new",
    origin: "brief",
    created_at: NOW.toISOString(),
    review: {
      headline: null,
      why: [],
      matched: [],
      missing: [],
      gaps: [],
      ...review,
    },
    job: {} as Match["job"],
  } as Match;
}

function brief(matches: Match[], stats: Record<string, unknown> = {}): Brief {
  return {
    id: "b1",
    status: "ready",
    stage: "done",
    trigger: "scheduled",
    local_date: "2026-10-05",
    created_at: "2026-10-05T10:00:00+08:00",
    finished_at: "2026-10-05T10:01:00+08:00",
    stats,
    error: null,
    matches,
  } as Brief;
}

describe("Home status", () => {
  it("says how many new jobs and how many match well", () => {
    const b = brief([match(90), match(80), match(40)], { good: 2 });
    expect(statusLine(b, null, NOW)).toBe(
      "Tailr found 3 new jobs today. 2 are good matches.",
    );
  });

  it("is honest when nothing matches well", () => {
    const b = brief([match(40)], { good: 0 });
    expect(statusLine(b, null, NOW)).toContain("none is a strong match yet");
  });

  it("handles no search yet, a running one and an empty one", () => {
    expect(statusLine(null, null, NOW)).toContain("Find your first jobs now");
    expect(
      statusLine({ ...brief([]), status: "building" }, null, NOW),
    ).toContain("searching LinkedIn and JobStreet");
    expect(statusLine(brief([]), "Monday 7:00 am", NOW)).toBe(
      "No new jobs since the last search. Tailr looks again Monday 7:00 am.",
    );
  });

  it("counts old searches that only kept good matches", () => {
    const b = brief([match(90), match(75)], { below_bar: false });
    expect(statusLine(b, null, NOW)).toBe(
      "Tailr found 2 new jobs today. All of them are good matches.",
    );
  });

  it("names the day of older searches", () => {
    expect(whenLabel("2026-10-04T12:00:00+08:00", NOW)).toBe("yesterday");
    expect(whenLabel("2026-10-02T12:00:00+08:00", NOW)).toBe("on Friday");
  });

  it("summarises the latest search in one line", () => {
    const b = brief([match(90)], { found: 59, new: 16 });
    expect(searchLine(b)).toBe(
      "Latest search: 59 jobs looked at, 16 new, 1 added to your Jobs page.",
    );
  });

  it("explains why a job suits you", () => {
    expect(whyLine(match(80, { headline: "Your RAG work fits." }))).toBe(
      "Your RAG work fits.",
    );
    expect(whyLine(match(80, { matched: ["Python", "SQL"] }))).toBe(
      "You have Python, SQL.",
    );
    expect(whyLine(match(80))).toBeNull();
  });
});
