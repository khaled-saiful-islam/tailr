/** Interview prep as the screen sees it: question cards, filters, readiness. Pure, so testable. */
import type { KitExtras } from "../api";
import type { Kind, Mark, Prep, Story } from "./api";

export const PITCH_ID = "pitch";

/** A question to prepare: from the full plan, or one of the five "likely" ones. */
export interface Card {
  id: string;
  kind: Kind | "likely";
  question: string;
  why: string;
  strong: string[];
  story: Story | null;
  /** The five likely questions carry their story as one paragraph. */
  storyText: string | null;
  factIds: string[];
  followUps: string[];
  pitfall: string;
  skill: string | null;
}

export const KINDS: { key: Kind; label: string; hint: string }[] = [
  {
    key: "role",
    label: "The job's skills",
    hint: "What this job needs, asked the way the hiring manager would.",
  },
  {
    key: "experience",
    label: "Your past work",
    hint: '"Tell me about a time…": answer with a story from your profile.',
  },
  {
    key: "gap",
    label: "Skills to explain",
    hint: "Must-haves your profile doesn't show yet. Be honest, then bridge from related work.",
  },
  {
    key: "situational",
    label: "What would you do",
    hint: "Real situations from this job. Think out loud, step by step.",
  },
  {
    key: "motivation",
    label: "Why this job",
    hint: "Why them and why now, from what the ad says.",
  },
];

export const KIND_LABEL: Record<Card["kind"], string> = {
  ...(Object.fromEntries(KINDS.map((k) => [k.key, k.label])) as Record<
    Kind,
    string
  >),
  likely: "Likely question",
};

export type Filter = "all" | "todo" | Kind;

export function cardsOf(prep: Pick<Prep, "plan" | "basic">): Card[] {
  if (prep.plan)
    return (prep.plan.questions ?? []).map((q) => ({
      id: q.id,
      kind: q.kind,
      question: q.question,
      why: q.why_they_ask,
      strong: q.strong_answer ?? [],
      story: q.story ?? null,
      storyText: null,
      factIds: q.story?.fact_ids ?? [],
      followUps: q.follow_ups ?? [],
      pitfall: q.pitfall ?? "",
      skill: q.skill ?? null,
    }));
  return (prep.basic ?? []).map((q) => ({
    id: q.id,
    kind: "likely",
    question: q.question,
    why: q.why_they_ask,
    strong: [],
    story: null,
    storyText: q.your_story,
    factIds: q.fact_ids ?? [],
    followUps: [],
    pitfall: "",
    skill: null,
  }));
}

/** While the prep loads, the questions that came with the application (no marks yet). */
export function cardsFromExtras(extras: KitExtras): Card[] {
  return cardsOf({
    plan: null,
    basic: (extras.interview ?? []).map((q) => ({ ...q, id: q.question })),
  });
}

export function countKinds(cards: Card[]): Record<Kind, number> {
  const counts = Object.fromEntries(KINDS.map((k) => [k.key, 0])) as Record<
    Kind,
    number
  >;
  for (const card of cards) if (card.kind !== "likely") counts[card.kind] += 1;
  return counts;
}

type Marks = Partial<Record<string, Mark>>;

export function visible(cards: Card[], filter: Filter, marks: Marks): Card[] {
  if (filter === "all") return cards;
  if (filter === "todo")
    return cards.filter((c) => marks[c.id] !== "confident");
  return cards.filter((c) => c.kind === filter);
}

export interface Readiness {
  confident: number;
  total: number;
  /** 0 to 100 */
  share: number;
}

export function readiness(ids: string[], marks: Marks): Readiness {
  const confident = ids.filter((id) => marks[id] === "confident").length;
  const total = ids.length;
  return {
    confident,
    total,
    share: total ? Math.round((confident / total) * 100) : 0,
  };
}

/** "45 seconds", "1 minute", "1 min 20 s": how long something takes to say. */
export function duration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} seconds`;
  const minutes = Math.floor(s / 60);
  const rest = s % 60;
  if (rest < 10) return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  return `${minutes} min ${rest} s`;
}

/** A practice score (1 to 5) in words. */
export function scoreLabel(score: number): string {
  if (score >= 5) return "Strong";
  if (score === 4) return "Good";
  if (score === 3) return "Getting there";
  return "Needs work";
}

/** The overall practice score: the average of the four, rounded. */
export function overall(scores: Record<string, number>): number {
  const values = Object.values(scores);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}
