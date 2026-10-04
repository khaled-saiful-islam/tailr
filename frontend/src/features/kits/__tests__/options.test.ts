import { describe, expect, it } from "vitest";
import { siteName, stageIndex } from "../options";

describe("siteName", () => {
  it("names the site to apply on", () => {
    expect(siteName("https://www.linkedin.com/jobs/view/123")).toBe("LinkedIn");
    expect(siteName("https://my.jobstreet.com/job/456")).toBe("JobStreet");
    expect(siteName("https://careers.example.com/ai")).toBe("the job site");
  });
});

describe("stageIndex", () => {
  it("follows the preparation stages", () => {
    expect(stageIndex("reading")).toBe(0);
    expect(stageIndex("done")).toBe(3);
    expect(stageIndex("unknown")).toBe(0);
  });
});
