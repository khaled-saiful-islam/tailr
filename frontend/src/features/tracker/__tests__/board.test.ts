import { describe, expect, it } from "vitest";
import type { Application } from "../api";
import {
  columnOf,
  moveCard,
  positionAt,
  statusLine,
  toColumns,
} from "../board";
import { fromDateInput, toDateInput, toDateTimeInput } from "../dates";

const NOW = new Date("2026-10-04T08:00:00Z");

function app(id: string, patch: Partial<Application> = {}): Application {
  return {
    id,
    stage: "saved",
    position: 0,
    stage_changed_at: "2026-10-01T08:00:00Z",
    created_at: "2026-10-01T08:00:00Z",
    notes: null,
    applied_at: null,
    next_step: null,
    next_step_at: null,
    contact_name: null,
    contact_email: null,
    follow_up_due_at: null,
    nudged_at: null,
    followed_up_at: null,
    follow_up_draft: null,
    match_id: null,
    score: 80,
    kit_id: null,
    kit_status: null,
    job: {
      id: `job-${id}`,
      source: "linkedin",
      url: "https://example.com",
      title: "AI Engineer",
      company: "Selat Pay",
      location: null,
      work_mode: null,
      employment_type: null,
      posted_at: null,
      posted_text: null,
      salary_text: null,
      salary_min: null,
      salary_max: null,
      company_logo: null,
      applicants: null,
    },
    ...patch,
  };
}

describe("columns", () => {
  const items = [
    app("a", { position: 2 }),
    app("b", { position: -1 }),
    app("c", { stage: "applied" }),
  ];

  it("groups by stage in position order", () => {
    const columns = toColumns(items);
    expect(columns.saved).toEqual(["b", "a"]);
    expect(columns.applied).toEqual(["c"]);
    expect(columns.rejected).toEqual([]);
  });

  it("finds a card's column, or a column by its id", () => {
    const columns = toColumns(items);
    expect(columnOf(columns, "c")).toBe("applied");
    expect(columnOf(columns, "column:offer")).toBe("offer");
    expect(columnOf(columns, "nope")).toBeNull();
  });

  it("moves without mutating", () => {
    const columns = toColumns(items);
    const moved = moveCard(columns, "a", "applied", 0);
    expect(moved.applied).toEqual(["a", "c"]);
    expect(moved.saved).toEqual(["b"]);
    expect(columns.saved).toEqual(["b", "a"]);
  });

  it("puts a dropped card between its neighbours", () => {
    const positions = new Map([
      ["x", 1],
      ["y", 3],
    ]);
    expect(positionAt(["x", "new", "y"], 1, positions)).toBe(2);
    expect(positionAt(["new", "x"], 0, positions)).toBe(0);
    expect(positionAt(["x", "new"], 1, positions)).toBe(2);
    expect(positionAt(["new"], 0, positions)).toBe(0);
  });
});

describe("status line", () => {
  it("says when to follow up", () => {
    const due = app("a", {
      stage: "applied",
      applied_at: "2026-09-26T08:00:00Z",
      follow_up_due_at: "2026-10-03T08:00:00Z",
    });
    expect(statusLine(due, NOW)).toEqual({
      text: "Time to follow up",
      tone: "due",
    });
    expect(
      statusLine({ ...due, followed_up_at: "2026-10-02T08:00:00Z" }, NOW).text,
    ).toBe("Followed up 2 days ago");
  });

  it("shows the next step, urgent within a day", () => {
    const soon = app("a", {
      stage: "interview",
      next_step: "Panel interview",
      next_step_at: "2026-10-04T20:00:00Z",
    });
    const line = statusLine(soon, NOW);
    expect(line.tone).toBe("due");
    expect(line.text.startsWith("Panel interview, ")).toBe(true);
  });

  it("knows when an application is ready", () => {
    const ready = app("a", { stage: "preparing", kit_status: "ready" });
    expect(statusLine(ready, NOW)).toEqual({
      text: "Application ready to send",
      tone: "good",
    });
  });
});

describe("dates", () => {
  it("round-trips the date and time inputs in local time", () => {
    const iso = fromDateInput("2026-10-02")!;
    expect(toDateInput(iso)).toBe("2026-10-02");
    expect(toDateTimeInput(iso)).toBe("2026-10-02T09:00");
    expect(fromDateInput("")).toBeNull();
  });
});
