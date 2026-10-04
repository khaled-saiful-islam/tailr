import type { Task } from "@/features/tasks/api";
import { isStale, ownerOf, rememberOwner } from "../useResumableTask";

const task = (finished_at: string | null): Task => ({
  id: "t1",
  kind: "profile.summary",
  status: "done",
  title: "Writing your summary",
  created_at: "2026-10-04T10:00:00Z",
  finished_at,
});

describe("resumable task memory", () => {
  beforeEach(() => window.localStorage.clear());

  it("remembers what each task was started for", () => {
    rememberOwner("a", "Cut checkout time by 30%");
    rememberOwner("b", "Led a team of five");
    expect(ownerOf("a")).toBe("Cut checkout time by 30%");
    expect(ownerOf("b")).toBe("Led a team of five");
    expect(ownerOf("c")).toBeUndefined();
  });

  it("keeps only the most recent tasks", () => {
    for (let i = 0; i < 50; i++) rememberOwner(`t${i}`, `line ${i}`);
    expect(ownerOf("t0")).toBeUndefined();
    expect(ownerOf("t49")).toBe("line 49");
  });

  it("survives broken storage", () => {
    window.localStorage.setItem("tailr.tasks.owners", "not json");
    expect(ownerOf("a")).toBeUndefined();
    rememberOwner("a", "fresh");
    expect(ownerOf("a")).toBe("fresh");
  });

  it("treats old answers as stale", () => {
    const now = Date.parse("2026-10-04T11:00:00Z");
    const hour = 60 * 60 * 1000;
    expect(isStale(task("2026-10-04T10:30:00Z"), now, hour)).toBe(false);
    expect(isStale(task("2026-10-04T09:30:00Z"), now, hour)).toBe(true);
    expect(isStale(task(null), now, 30 * 60 * 1000)).toBe(true);
  });
});
