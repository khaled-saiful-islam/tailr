/** Pure helpers for the board: columns, drop positions, and each card's status line. */
import { relativeTime } from "@/lib/format";
import { followUpDue, type Application } from "./api";
import { STAGES, type Stage } from "./stages";

export type Columns = Record<Stage, string[]>;

/** Card ids per stage, in board order (smaller position is higher). */
export function toColumns(items: Application[]): Columns {
  const columns = Object.fromEntries(
    STAGES.map((stage) => [stage, [] as string[]]),
  ) as Columns;
  [...items]
    .sort((a, b) => a.position - b.position)
    .forEach((item) => columns[item.stage].push(item.id));
  return columns;
}

/** Which column holds this card or column id ("column:applied"). */
export function columnOf(columns: Columns, id: string): Stage | null {
  if (id.startsWith("column:")) return id.slice(7) as Stage;
  return STAGES.find((stage) => columns[stage].includes(id)) ?? null;
}

/** A position that sorts between the neighbours of `index` in `ids`. */
export function positionAt(
  ids: string[],
  index: number,
  positions: Map<string, number>,
): number {
  const before = index > 0 ? positions.get(ids[index - 1]!) : undefined;
  const after =
    index < ids.length - 1 ? positions.get(ids[index + 1]!) : undefined;
  if (before !== undefined && after !== undefined) return (before + after) / 2;
  if (before !== undefined) return before + 1;
  if (after !== undefined) return after - 1;
  return 0;
}

/** Move `id` into `to` at `index`, returning new columns (never mutates). */
export function moveCard(
  columns: Columns,
  id: string,
  to: Stage,
  index: number,
): Columns {
  const next = Object.fromEntries(
    STAGES.map((stage) => [
      stage,
      columns[stage].filter((card) => card !== id),
    ]),
  ) as Columns;
  const target = [...next[to]];
  target.splice(Math.max(0, Math.min(index, target.length)), 0, id);
  return { ...next, [to]: target };
}

export interface StatusLine {
  text: string;
  tone: "quiet" | "due" | "good";
}

const DAY = 86_400_000;

function shortWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** The one line under each card that says what matters now. */
export function statusLine(app: Application, now = new Date()): StatusLine {
  if (followUpDue(app, now)) return { text: "Time to follow up", tone: "due" };
  if (app.next_step_at && new Date(app.next_step_at) > now) {
    const soon = new Date(app.next_step_at).getTime() - now.getTime() < DAY;
    return {
      text: `${app.next_step ?? "Next step"}, ${shortWhen(app.next_step_at)}`,
      tone: soon ? "due" : "quiet",
    };
  }
  switch (app.stage) {
    case "saved":
      return {
        text: `Saved ${relativeTime(app.created_at, now)}`,
        tone: "quiet",
      };
    case "preparing":
      if (app.kit_status === "ready")
        return { text: "Kit ready to send", tone: "good" };
      if (app.kit_status === "building")
        return { text: "Tailoring your kit", tone: "quiet" };
      return {
        text: `Since ${relativeTime(app.stage_changed_at, now)}`,
        tone: "quiet",
      };
    case "applied":
      if (app.followed_up_at)
        return {
          text: `Followed up ${relativeTime(app.followed_up_at, now)}`,
          tone: "quiet",
        };
      return {
        text: `Applied ${relativeTime(app.applied_at ?? app.stage_changed_at, now)}`,
        tone: "quiet",
      };
    case "interview":
      return { text: "Add your next step", tone: "quiet" };
    case "offer":
      return {
        text: `Offer ${relativeTime(app.stage_changed_at, now)}`,
        tone: "good",
      };
    case "rejected":
      return {
        text: `Closed ${relativeTime(app.stage_changed_at, now)}`,
        tone: "quiet",
      };
  }
}
