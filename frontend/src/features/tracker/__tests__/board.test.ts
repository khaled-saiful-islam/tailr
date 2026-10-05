import { describe, expect, it } from "vitest";
import { columnOf, moveCard, positionAt, toColumns } from "../board";
import { app } from "./fixtures";
import { fromDateInput, toDateInput, toDateTimeInput } from "../dates";

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

describe("dates", () => {
  it("round-trips the date and time inputs in local time", () => {
    const iso = fromDateInput("2026-10-02")!;
    expect(toDateInput(iso)).toBe("2026-10-02");
    expect(toDateTimeInput(iso)).toBe("2026-10-02T09:00");
    expect(fromDateInput("")).toBeNull();
  });
});
