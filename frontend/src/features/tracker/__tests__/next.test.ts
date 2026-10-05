import { describe, expect, it } from "vitest";
import { needsYou, nextAction, progressSentence } from "../next";
import { app } from "./fixtures";

const NOW = new Date("2026-10-04T08:00:00Z");

describe("the next thing to do on each card", () => {
  it("asks to prepare a saved job, and to send a ready one", () => {
    expect(nextAction(app("a"), NOW)).toEqual({
      text: "Prepare your application",
      tone: "act",
    });
    expect(
      nextAction(app("a", { stage: "preparing", kit_status: "ready" }), NOW),
    ).toEqual({ text: "Ready: check it and send it", tone: "act" });
    expect(
      nextAction(app("a", { stage: "preparing", kit_status: "building" }), NOW)
        .tone,
    ).toBe("quiet");
  });

  it("says when to follow up, and otherwise that you're waiting", () => {
    const sent = app("a", {
      stage: "applied",
      applied_at: "2026-09-26T08:00:00Z",
      follow_up_due_at: "2026-10-03T08:00:00Z",
    });
    expect(nextAction(sent, NOW)).toEqual({
      text: "Follow up today",
      tone: "due",
    });
    const followed = { ...sent, followed_up_at: "2026-10-02T08:00:00Z" };
    expect(nextAction(followed, NOW)).toEqual({
      text: "Followed up 2 days ago. Waiting to hear back",
      tone: "wait",
    });
  });

  it("shows the interview, urgent within a day, or asks for its date", () => {
    const soon = app("a", {
      stage: "interview",
      next_step: "Panel interview",
      next_step_at: "2026-10-04T20:00:00Z",
    });
    expect(nextAction(soon, NOW).tone).toBe("due");
    expect(nextAction(soon, NOW).text.startsWith("Panel interview, ")).toBe(
      true,
    );
    expect(nextAction(app("b", { stage: "interview" }), NOW)).toEqual({
      text: "Add the interview date",
      tone: "act",
    });
    const past = app("c", {
      stage: "interview",
      next_step_at: "2026-10-03T02:00:00Z",
    });
    expect(nextAction(past, NOW).text).toBe("How did it go? Update it");
  });
});

describe("needs you now", () => {
  it("lists calls coming up first, then follow-ups, ready applications and missing dates", () => {
    const items = [
      app("saved"),
      app("ready", { stage: "preparing", kit_status: "ready" }),
      app("follow", {
        stage: "applied",
        applied_at: "2026-09-26T08:00:00Z",
        follow_up_due_at: "2026-10-03T08:00:00Z",
      }),
      app("call", {
        stage: "interview",
        next_step: "Technical interview",
        next_step_at: "2026-10-06T02:00:00Z",
      }),
      app("undated", { stage: "interview" }),
      app("happened", {
        stage: "interview",
        next_step: "Panel interview",
        next_step_at: "2026-10-03T02:00:00Z",
      }),
      app("later", {
        stage: "interview",
        next_step_at: "2026-10-20T02:00:00Z",
      }),
      app("closed", {
        stage: "rejected",
        next_step_at: "2026-10-05T02:00:00Z",
      }),
    ];
    const needs = needsYou(items, NOW);
    expect(needs.map((need) => need.app.id)).toEqual([
      "call",
      "follow",
      "happened",
      "ready",
      "undated",
    ]);
    expect(needs[2]!.title).toBe("How did it go with Selat Pay?");
    expect(needs[0]!.title).toBe("Technical interview with Selat Pay");
  });

  it("is empty when nothing needs you", () => {
    expect(needsYou([app("a"), app("b", { stage: "offer" })], NOW)).toEqual([]);
  });
});

describe("how far applications got, in a sentence", () => {
  it("reads naturally for every case", () => {
    expect(
      progressSentence({ saved: 8, applied: 5, interview: 2, offer: 1 }),
    ).toBe(
      "Of the 8 jobs you've saved, you applied to 5. 2 led to interviews, and 1 to an offer.",
    );
    expect(
      progressSentence({ saved: 3, applied: 3, interview: 1, offer: 0 }),
    ).toBe(
      "Of the 3 jobs you've saved, you applied to all of them. 1 led to an interview.",
    );
    expect(
      progressSentence({ saved: 2, applied: 1, interview: 0, offer: 0 }),
    ).toBe(
      "Of the 2 jobs you've saved, you applied to 1. No interviews yet. Replies often take a week or two.",
    );
    expect(
      progressSentence({ saved: 1, applied: 0, interview: 0, offer: 0 }),
    ).toBe("You've saved 1 job. You haven't applied to it yet.");
    expect(
      progressSentence({ saved: 0, applied: 0, interview: 0, offer: 0 }),
    ).toBe("Nothing saved yet.");
  });
});
