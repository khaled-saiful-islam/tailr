import { describe, expect, it } from "vitest";
import type { CoverLetter, TailoredResume } from "../api";
import {
  letterAsText,
  letterWordCount,
  removeBullet,
  setBullet,
  setParagraph,
  sourcesFor,
} from "../edit";

const resume: TailoredResume = {
  headline: "AI Engineer",
  summary: "Builds things.",
  roles: [
    {
      experience_id: "exp1",
      bullets: [
        { text: "Shipped A", fact_ids: ["f1"] },
        { text: "Shipped B", fact_ids: ["f2"] },
      ],
    },
  ],
  projects: [
    { project_id: "prj1", bullets: [{ text: "Built C", fact_ids: ["f3"] }] },
  ],
  skills: ["Python", "Kubernetes"],
};

const letter: CoverLetter = {
  greeting: "Dear Hiring Team,",
  paragraphs: ["First one here.", "Second paragraph is longer."],
  closing: "Best regards,",
};

describe("resume edits", () => {
  it("changes one bullet without touching the original", () => {
    const next = setBullet(
      resume,
      { kind: "role", id: "exp1" },
      1,
      "Shipped B faster",
    );
    expect(next.roles?.[0]?.bullets?.[1]?.text).toBe("Shipped B faster");
    expect(next.roles?.[0]?.bullets?.[1]?.fact_ids).toEqual(["f2"]);
    expect(resume.roles?.[0]?.bullets?.[1]?.text).toBe("Shipped B");
  });

  it("edits project bullets too", () => {
    const next = setBullet(
      resume,
      { kind: "project", id: "prj1" },
      0,
      "Built C well",
    );
    expect(next.projects?.[0]?.bullets?.[0]?.text).toBe("Built C well");
    expect(next.roles).toBe(resume.roles);
  });

  it("removes a bullet", () => {
    const next = removeBullet(resume, { kind: "role", id: "exp1" }, 0);
    expect(next.roles?.[0]?.bullets?.map((b) => b.text)).toEqual(["Shipped B"]);
  });
});

describe("letter", () => {
  it("edits a paragraph immutably", () => {
    const next = setParagraph(letter, 0, "New opening.");
    expect(next.paragraphs).toEqual([
      "New opening.",
      "Second paragraph is longer.",
    ]);
    expect(letter.paragraphs?.[0]).toBe("First one here.");
  });

  it("counts words in the body", () => {
    expect(letterWordCount(letter)).toBe(7);
  });

  it("joins into plain text for copying", () => {
    expect(letterAsText(letter, "Aina Rahman")).toBe(
      "Dear Hiring Team,\n\nFirst one here.\n\nSecond paragraph is longer.\n\nBest regards,\nAina Rahman",
    );
  });
});

describe("sourcesFor", () => {
  it("returns the profile facts a line cites, skipping unknown ids", () => {
    const facts = [
      { id: "f1", text: "Shipped A in 2024", owner: "Engineer at X" },
      { id: "f2", text: "Shipped B", owner: "Engineer at X" },
    ];
    expect(sourcesFor(["f2", "nope"], facts).map((f) => f.text)).toEqual([
      "Shipped B",
    ]);
    expect(sourcesFor(undefined, facts)).toEqual([]);
  });
});
