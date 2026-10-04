import type { Schemas } from "@/lib/api/client";

export type Stage = Schemas["Stage"];

/** The way forward, left to right. "Not successful" sits apart from it. */
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
  interview: "Interview",
  offer: "Offer",
  rejected: "Not successful",
};

/** What each column is for, in a line. */
export const STAGE_HINT: Record<Stage, string> = {
  saved: "Jobs you liked. Prepare an application when you're ready.",
  preparing: "Your application is being written, or ready to send.",
  applied: "Sent. Tailr reminds you to follow up after a week.",
  interview: "Talking to them. Add the date of your next step.",
  offer: "They want you.",
  rejected: "They said no this time. Every no is practice.",
};

export function isStage(value: string | null): value is Stage {
  return value !== null && (STAGES as string[]).includes(value);
}

/** How far along the path a stage is; "not this time" is off the path (-1). */
export function step(stage: Stage): number {
  return PATH.indexOf(stage);
}
