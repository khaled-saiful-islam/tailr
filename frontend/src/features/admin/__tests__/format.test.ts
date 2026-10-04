import { describe, expect, it } from "vitest";
import {
  compact,
  dayLabel,
  exact,
  purposeLabel,
  share,
  sourceLabel,
  sourceTone,
} from "../format";

describe("numbers", () => {
  it("shortens big numbers", () => {
    expect(compact(950)).toBe("950");
    expect(compact(12_340)).toBe("12.3k");
    expect(compact(1_500_000)).toBe("1.5M");
    expect(compact(2_000_000)).toBe("2M");
    expect(compact(250_000)).toBe("250k");
    expect(compact(3_200_000_000)).toBe("3.2B");
  });

  it("keeps every digit when asked", () => {
    expect(exact(1500000)).toBe("1,500,000");
  });

  it("measures a budget, where 0 means unlimited", () => {
    expect(share(500, 1000)).toBe(0.5);
    expect(share(2000, 1000)).toBe(1);
    expect(share(2000, 0)).toBe(0);
  });
});

describe("labels", () => {
  it("names AI uses plainly", () => {
    expect(purposeLabel("kits.tailor")).toBe("Preparing applications");
    expect(purposeLabel("tracker.follow_up")).toBe("Follow-up drafts");
    expect(purposeLabel("something.new")).toBe("something.new");
  });

  it("names job sites", () => {
    expect(sourceLabel("linkedin")).toBe("LinkedIn");
    expect(sourceLabel("other")).toBe("other");
  });

  it("flags sources that need a look", () => {
    expect(sourceTone({ runs: 10, failed: 0, empty: 1 })).toBe("good");
    expect(sourceTone({ runs: 10, failed: 1, empty: 3 })).toBe("warn");
    expect(sourceTone({ runs: 10, failed: 5, empty: 0 })).toBe("bad");
    expect(sourceTone({ runs: 0, failed: 0, empty: 0 })).toBe("warn");
  });

  it("labels days", () => {
    expect(dayLabel("2026-09-15")).toBe("15 Sept");
  });
});
