/**
 * What to do next, in plain words: the one line on each card, the "Needs you now" list
 * at the top of the page, and the sentence that sums up how far applications got.
 */
import { relativeTime } from "@/lib/format";
import { followUpDue, type Application } from "./api";
import { dayLabel } from "./dates";

export type Tone =
  /** Something for you to do. */
  | "act"
  /** Do it today. */
  | "due"
  /** Waiting on them. */
  | "wait"
  /** Good news. */
  | "good"
  /** Nothing to do. */
  | "quiet";

export interface NextAction {
  text: string;
  tone: Tone;
}

const DAY = 86_400_000;
/** "Needs you now" looks this far ahead for interviews and calls. */
const SOON = 3 * DAY;

export function shortWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function upcoming(app: Application, now: Date): string | null {
  return app.next_step_at && new Date(app.next_step_at) > now
    ? app.next_step_at
    : null;
}

/** The one thing that matters now for this application. */
export function nextAction(app: Application, now = new Date()): NextAction {
  if (followUpDue(app, now)) return { text: "Follow up today", tone: "due" };
  const at = upcoming(app, now);
  if (at && app.stage !== "rejected") {
    const soon = new Date(at).getTime() - now.getTime() < DAY;
    return {
      text: `${app.next_step ?? "Next step"}, ${shortWhen(at)}`,
      tone: soon ? "due" : "act",
    };
  }
  switch (app.stage) {
    case "saved":
    case "preparing":
      if (app.kit_status === "ready")
        return { text: "Ready: check it and send it", tone: "act" };
      if (app.kit_status === "building")
        return { text: "Tailr is writing your application", tone: "quiet" };
      return { text: "Prepare your application", tone: "act" };
    case "applied":
      if (app.followed_up_at)
        return {
          text: `Followed up ${relativeTime(app.followed_up_at, now)}. Waiting to hear back`,
          tone: "wait",
        };
      return {
        text: `Sent ${relativeTime(app.applied_at ?? app.stage_changed_at, now)}. Waiting to hear back`,
        tone: "wait",
      };
    case "interview":
      return app.next_step_at
        ? { text: "How did it go? Update it", tone: "act" }
        : { text: "Add the interview date", tone: "act" };
    case "offer":
      return { text: "You have an offer", tone: "good" };
    case "rejected":
      return {
        text: `Closed ${relativeTime(app.stage_changed_at, now)}`,
        tone: "quiet",
      };
  }
}

export type NeedKind = "follow_up" | "soon" | "outcome" | "send" | "date";

export interface Need {
  app: Application;
  kind: NeedKind;
  title: string;
  detail: string;
}

const ORDER: Record<NeedKind, number> = {
  soon: 0,
  follow_up: 1,
  outcome: 2,
  send: 3,
  date: 4,
};

/** What to do today, most urgent first: calls coming up, follow-ups, ready applications. */
export function needsYou(items: Application[], now = new Date()): Need[] {
  const needs: Need[] = [];
  for (const app of items) {
    const company = app.job.company;
    const at = upcoming(app, now);
    if (
      at &&
      app.stage !== "rejected" &&
      new Date(at).getTime() - now.getTime() <= SOON
    ) {
      needs.push({
        app,
        kind: "soon",
        title: `${app.next_step ?? "Next step"} with ${company}`,
        detail: `${shortWhen(at)}. Tailr reminds you the day before.`,
      });
    } else if (followUpDue(app, now)) {
      needs.push({
        app,
        kind: "follow_up",
        title: `Follow up with ${company}`,
        detail: `You applied ${relativeTime(app.applied_at ?? app.stage_changed_at, now)}. Tailr can draft a short note.`,
      });
    } else if (
      (app.stage === "saved" || app.stage === "preparing") &&
      app.kit_status === "ready"
    ) {
      needs.push({
        app,
        kind: "send",
        title: `Send your application to ${company}`,
        detail:
          "It's ready. Check it, send it on the job site, then tell Tailr.",
      });
    } else if (app.stage === "interview" && app.next_step_at && !at) {
      needs.push({
        app,
        kind: "outcome",
        title: `How did it go with ${company}?`,
        detail: `${app.next_step ?? "Your interview"} was ${dayLabel(app.next_step_at)}. Tell Tailr what happened.`,
      });
    } else if (app.stage === "interview" && !at) {
      needs.push({
        app,
        kind: "date",
        title: `Add the interview date for ${company}`,
        detail: "So Tailr can remind you the day before.",
      });
    }
  }
  return needs.sort(
    (a, b) =>
      ORDER[a.kind] - ORDER[b.kind] ||
      (a.app.next_step_at ?? "").localeCompare(b.app.next_step_at ?? ""),
  );
}

export interface Reached {
  saved: number;
  applied: number;
  interview: number;
  offer: number;
}

/** "Of the 8 jobs you've saved, you applied to 5. 2 led to interviews, and 1 to an offer." */
export function progressSentence(reached: Reached): string {
  const { saved, applied, interview, offer } = reached;
  if (saved === 0) return "Nothing saved yet.";
  const jobs = saved === 1 ? "1 job" : `${saved} jobs`;
  if (applied === 0)
    return `You've saved ${jobs}. You haven't applied to ${saved === 1 ? "it" : "any"} yet.`;
  const start =
    saved === 1
      ? "You've saved 1 job and applied to it."
      : `Of the ${jobs} you've saved, you applied to ${applied === saved ? "all of them" : applied}.`;
  if (interview === 0)
    return `${start} No interviews yet. Replies often take a week or two.`;
  const offers =
    offer > 0 ? `, and ${offer} to ${offer === 1 ? "an offer" : "offers"}` : "";
  return `${start} ${interview} led to ${interview === 1 ? "an interview" : "interviews"}${offers}.`;
}

/** When to follow up, in a sentence. */
export function followUpWhen(app: Application, due: boolean): string {
  if (due)
    return "It's been a week since you applied. A short, friendly note keeps you on their radar.";
  return app.follow_up_due_at
    ? `Tailr will remind you on ${dayLabel(app.follow_up_due_at)}, a week after you applied.`
    : "Tailr reminds you a week after you apply.";
}
