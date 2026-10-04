import { afterEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@/features/tasks/api";
import { isClosed, markClosed, partOf, rememberPart } from "../remembered";
import {
  asDraft,
  asHighlights,
  guessPart,
  hasContent,
  isFresh,
} from "../suggestionResults";

function task(changes: Partial<Task> = {}): Task {
  return {
    id: "t1",
    kind: "website.draft",
    status: "done",
    title: "Drafting your website",
    created_at: "2026-10-04T10:00:00Z",
    finished_at: "2026-10-04T10:00:20Z",
    ...changes,
  };
}

describe("reading a draft task's result", () => {
  it("fills in what's missing and drops what has the wrong shape", () => {
    expect(asDraft({ hero_line: 3, about: "no", needs_input: ["x"] })).toEqual({
      hero_line: null,
      about: [],
      expertise: [],
      case_studies: {},
      needs_input: ["x"],
    });
    expect(asDraft(null).about).toEqual([]);
    expect(asHighlights({ value: "40k" })).toEqual([]);
  });

  it("tells which panel a draft belongs to from what it contains", () => {
    expect(guessPart({ hero_line: "I build search" })).toBe("story");
    expect(
      guessPart({
        expertise: [{ title: "Search", description: "", tools: [] }],
      }),
    ).toBe("expertise");
    expect(guessPart({ case_studies: { p1: { overview: "Hi" } } })).toBe(
      "case_studies",
    );
    expect(guessPart({ needs_input: ["an outcome"] })).toBeUndefined();
  });

  it("counts a draft that only asks for more as worth showing", () => {
    const asks = asDraft({ needs_input: ["your role"] });
    expect(hasContent("story", asks)).toBe(true);
    expect(hasContent("case_studies", asDraft({}))).toBe(false);
    expect(hasContent("highlights", [])).toBe(false);
  });

  it("brings back only results from the last hour", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T10:30:00Z"));
    expect(isFresh(task())).toBe(true);
    vi.setSystemTime(new Date("2026-10-04T11:30:00Z"));
    expect(isFresh(task())).toBe(false);
    expect(isFresh(task({ finished_at: null }))).toBe(false);
    vi.useRealTimers();
  });
});

describe("remembering suggestions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("remembers which panel started a task, and what was put away", () => {
    rememberPart("a", "expertise");
    expect(partOf("a")).toBe("expertise");
    expect(isClosed("a")).toBe(false);
    markClosed("a");
    expect(isClosed("a")).toBe(true);
  });

  it("ignores stored data it doesn't recognise", () => {
    window.localStorage.setItem(
      "tailr.website-suggestions",
      JSON.stringify({ parts: { a: "nonsense" }, closed: [1, "b"] }),
    );
    expect(partOf("a")).toBeUndefined();
    expect(isClosed("b")).toBe(true);
  });

  it("keeps working for the visit when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    markClosed("c");
    expect(isClosed("c")).toBe(true);
  });
});
