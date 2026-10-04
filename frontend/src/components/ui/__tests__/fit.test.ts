import { fitLabel, fitLevel } from "../fit";

describe("fitLevel", () => {
  it.each([
    [100, "strong"],
    [85, "strong"],
    [84, "good"],
    [70, "good"],
    [69, "stretch"],
    [50, "stretch"],
    [49, "low"],
    [0, "low"],
  ] as const)("scores %i as %s", (score, level) => {
    expect(fitLevel(score)).toBe(level);
  });

  it("has a readable label for every band", () => {
    expect(fitLabel[fitLevel(92)]).toBe("Strong fit");
    expect(fitLabel[fitLevel(30)]).toBe("Long shot");
  });
});
