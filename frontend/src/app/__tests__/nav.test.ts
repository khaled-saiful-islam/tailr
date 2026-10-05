import { describe, expect, it } from "vitest";
import { isNavActive, navItems } from "../nav";

const active = (pathname: string) =>
  navItems.filter((item) => isNavActive(item, pathname)).map((i) => i.label);

describe("which menu item is lit", () => {
  it("lights Jobs for a job and for a prepared application", () => {
    expect(active("/jobs")).toEqual(["Jobs"]);
    expect(active("/jobs/4f1c")).toEqual(["Jobs"]);
    expect(active("/apply/9a2b")).toEqual(["Jobs"]);
  });

  it("lights Applications for the board and one application", () => {
    expect(active("/applications")).toEqual(["Applications"]);
    expect(active("/applications/77")).toEqual(["Applications"]);
  });

  it("lights Home only on the home page, and never two at once", () => {
    expect(active("/")).toEqual(["Home"]);
    expect(active("/profile/cv")).toEqual(["Profile"]);
    expect(active("/jobsearch")).toEqual([]);
  });
});
