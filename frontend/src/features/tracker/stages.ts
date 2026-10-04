import type { Schemas } from "@/lib/api/client";

export type Stage = Schemas["Stage"];

/** The way forward, left to right. "Not this time" sits apart from it. */
export const PATH: Stage[] = [
  "saved",
  "preparing",
  "applied",
  "interview",
  "offer",
];
export const STAGES: Stage[] = [...PATH, "rejected"];

export const STAGE_LABEL: Record<Stage, string> = {
  saved: "Saved",
  preparing: "Preparing",
  applied: "Applied",
  interview: "Interviewing",
  offer: "Offer",
  rejected: "Not this time",
};

/** What each column is for, in a line. */
export const STAGE_HINT: Record<Stage, string> = {
  saved: "Jobs you liked. Tailor one when you're ready.",
  preparing: "Your kit is being made, or ready to send.",
  applied: "Sent. Tailr nudges you to follow up after a week.",
  interview: "Talking to them. Add the date of your next step.",
  offer: "They want you.",
  rejected: "Closed for now. Every no is practice.",
};

export function isStage(value: string | null): value is Stage {
  return value !== null && (STAGES as string[]).includes(value);
}

/** How far along the path a stage is; "not this time" is off the path (-1). */
export function step(stage: Stage): number {
  return PATH.indexOf(stage);
}
