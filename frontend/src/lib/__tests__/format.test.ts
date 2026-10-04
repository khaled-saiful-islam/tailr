import { greeting, initials, relativeTime, ringgit } from "../format";

describe("format", () => {
  it("greets by time of day", () => {
    expect(greeting(new Date(2026, 9, 4, 8))).toBe("Good morning");
    expect(greeting(new Date(2026, 9, 4, 14))).toBe("Good afternoon");
    expect(greeting(new Date(2026, 9, 4, 20))).toBe("Good evening");
    expect(greeting(new Date(2026, 9, 4, 2))).toBe("Working late");
  });

  it("builds initials from first and last names", () => {
    expect(initials("Khaled Saiful Islam")).toBe("KI");
    expect(initials("admin")).toBe("A");
    expect(initials("   ")).toBe("?");
  });

  it("describes time relative to now", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    expect(relativeTime("2026-10-04T10:00:00Z", now)).toBe("2 hours ago");
    expect(relativeTime("2026-10-03T12:00:00Z", now)).toBe("yesterday");
    expect(relativeTime("2026-10-04T11:59:40Z", now)).toBe("just now");
  });

  it("formats ringgit without decimals", () => {
    expect(ringgit(15000)).toMatch(/RM\s?15,000/);
  });
});
