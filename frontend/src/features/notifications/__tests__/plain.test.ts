import { describe, expect, it } from "vitest";
import { plainBody, plainLink, plainTitle } from "../plain";

describe("older notifications in plain words", () => {
  it("renames the old job-search titles", () => {
    expect(plainTitle({ title: "Your brief is ready" })).toBe(
      "New jobs for you",
    );
    expect(plainTitle({ title: "Your CV is updated" })).toBe(
      "Your CV is updated",
    );
  });

  it("rewrites the old summary lines", () => {
    expect(
      plainBody({
        body: "12 jobs measured against your profile. Selat Pay fits best.",
      }),
    ).toBe("12 new jobs; the best match is at Selat Pay.");
    expect(plainBody({ body: "1 job measured against your profile." })).toBe(
      "1 new job.",
    );
    expect(plainBody({ body: "Hi there." })).toBe("Hi there.");
    expect(plainBody({ body: null })).toBeNull();
  });

  it("points old links at the renamed pages", () => {
    expect(plainLink("/kits/abc")).toBe("/apply/abc");
    expect(plainLink("/tracker?open=1")).toBe("/applications?open=1");
    expect(plainLink("/jobs")).toBe("/jobs");
    expect(plainLink(null)).toBeNull();
  });
});
