import { passwordStrength } from "../passwordStrength";

describe("passwordStrength", () => {
  it("rewards length first, then variety", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("short")).toBe(0);
    expect(passwordStrength("eightchr")).toBe(1);
    expect(passwordStrength("twelve-chars")).toBe(2);
    expect(passwordStrength("Twelve-Chars")).toBe(3);
    expect(passwordStrength("Twelve-Chars-2026")).toBe(4);
  });
});
