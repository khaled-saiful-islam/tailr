/** Reading what a website suggestion task left behind. Results are server data. */
import type { Task } from "@/features/tasks/api";
import type { DraftPart, Highlight, PortfolioDraft } from "./api";
import type { SlotKey } from "./remembered";

/** A suggestion that finished while you were away comes back for this long. */
const FRESH_MS = 60 * 60 * 1000;

export interface SlotValues {
  story: PortfolioDraft;
  expertise: PortfolioDraft;
  case_studies: PortfolioDraft;
  highlights: Highlight[];
}

export const NOTHING: Record<SlotKey, { title: string; description: string }> =
  {
    story: {
      title: "Nothing to draft yet",
      description: "Add your experience to your profile, then try again.",
    },
    expertise: {
      title: "Nothing to draft yet",
      description:
        "Add your experience and skills to your profile, then try again.",
    },
    case_studies: {
      title: "Nothing to draft yet",
      description: "Add details to your projects in your profile first.",
    },
    highlights: {
      title: "No numbers to lead with yet",
      description:
        "Add results with numbers to your profile (people, money, time, percentages) and try again.",
    },
  };

/** The task's result is server data: take only what has the expected shape. */
export function asDraft(result: unknown): PortfolioDraft {
  const raw = (result && typeof result === "object" ? result : {}) as Partial<
    Record<keyof PortfolioDraft, unknown>
  >;
  return {
    hero_line: typeof raw.hero_line === "string" ? raw.hero_line : null,
    about: Array.isArray(raw.about) ? raw.about : [],
    expertise: Array.isArray(raw.expertise) ? raw.expertise : [],
    case_studies:
      raw.case_studies && typeof raw.case_studies === "object"
        ? (raw.case_studies as PortfolioDraft["case_studies"])
        : {},
    needs_input: Array.isArray(raw.needs_input) ? raw.needs_input : [],
  };
}

export function asHighlights(result: unknown): Highlight[] {
  return Array.isArray(result) ? (result as Highlight[]) : [];
}

export function hasContent(
  key: SlotKey,
  value: PortfolioDraft | Highlight[],
): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value.needs_input.length) return true;
  if (key === "story") return Boolean(value.hero_line || value.about.length);
  if (key === "expertise") return value.expertise.length > 0;
  return Object.keys(value.case_studies).length > 0;
}

/** Each panel asks for one part, so a draft's content says whose it is. */
export function guessPart(result: unknown): DraftPart | undefined {
  const draft = asDraft(result);
  if (Object.keys(draft.case_studies).length) return "case_studies";
  if (draft.expertise.length) return "expertise";
  if (draft.hero_line || draft.about.length) return "story";
  return undefined;
}

export function isFresh(task: Task): boolean {
  return Boolean(
    task.finished_at && Date.now() - Date.parse(task.finished_at) < FRESH_MS,
  );
}
