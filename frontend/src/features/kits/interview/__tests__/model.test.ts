import { describe, expect, it } from "vitest";
import type { Prep } from "../api";
import {
  cardsFromExtras,
  cardsOf,
  countKinds,
  duration,
  overall,
  readiness,
  scoreLabel,
  visible,
} from "../model";

const question = (id: string, kind: "role" | "gap" | "experience") => ({
  id,
  kind,
  question: `Question ${id}?`,
  why_they_ask: "Why.",
  strong_answer: ["One", "Two"],
  story: null,
  follow_ups: [],
  pitfall: "",
  skill: null,
});

const plan = {
  language: "en" as const,
  built_at: "2026-10-05T00:00:00Z",
  pitch: { text: "I build things.", fact_ids: [], seconds: 40 },
  questions: [
    question("a", "role"),
    question("b", "role"),
    question("c", "gap"),
  ],
  ask_them: [],
  checklist: [],
  gaps: ["Rust"],
  stories_removed: 0,
} satisfies Prep["plan"];

const basic = [
  {
    id: "x1",
    question: "Tell me about RAG.",
    why_they_ask: "Core.",
    your_story: "I built one.",
    fact_ids: ["f1"],
  },
];

describe("interview cards", () => {
  it("uses the full plan when there is one", () => {
    const cards = cardsOf({ plan, basic });
    expect(cards.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(cards[0]?.strong).toEqual(["One", "Two"]);
  });

  it("falls back to the five likely questions, with their story as a paragraph", () => {
    const [card] = cardsOf({ plan: null, basic });
    expect(card?.kind).toBe("likely");
    expect(card?.storyText).toBe("I built one.");
    expect(card?.factIds).toEqual(["f1"]);
  });

  it("shows the application's questions while the prep loads", () => {
    const cards = cardsFromExtras({
      recruiter_message: "",
      interview: [
        { question: "Why us?", why_they_ask: "Fit.", your_story: "Because." },
      ],
    });
    expect(cards[0]?.id).toBe("Why us?");
  });

  it("counts and filters by kind, and by what isn't confident yet", () => {
    const cards = cardsOf({ plan, basic });
    expect(countKinds(cards)).toMatchObject({ role: 2, gap: 1, experience: 0 });
    expect(visible(cards, "gap", {}).map((c) => c.id)).toEqual(["c"]);
    const marks = { a: "confident", b: "practice" } as const;
    expect(visible(cards, "todo", marks).map((c) => c.id)).toEqual(["b", "c"]);
    expect(visible(cards, "all", marks)).toHaveLength(3);
  });
});

describe("readiness and practice scores", () => {
  it("counts only questions marked confident", () => {
    expect(
      readiness(["pitch", "a", "b", "c"], {
        pitch: "confident",
        a: "practice",
      }),
    ).toEqual({
      confident: 1,
      total: 4,
      share: 25,
    });
    expect(readiness([], {}).share).toBe(0);
  });

  it("says how long an answer takes to say", () => {
    expect(duration(45)).toBe("45 seconds");
    expect(duration(62)).toBe("1 minute");
    expect(duration(80)).toBe("1 min 20 s");
    expect(duration(125)).toBe("2 minutes");
  });

  it("puts scores in words", () => {
    expect(scoreLabel(5)).toBe("Strong");
    expect(scoreLabel(3)).toBe("Getting there");
    expect(scoreLabel(1)).toBe("Needs work");
    expect(
      overall({ structure: 4, specificity: 2, relevance: 5, length: 3 }),
    ).toBe(4);
  });
});
