import { describe, expect, it } from "vitest";
import { elapsedLabel } from "../reading";

describe("elapsedLabel", () => {
  it("counts seconds, then minutes", () => {
    expect(elapsedLabel(1)).toBe("1 second");
    expect(elapsedLabel(18)).toBe("18 seconds");
    expect(elapsedLabel(65)).toBe("1 min 5 s");
  });
});
