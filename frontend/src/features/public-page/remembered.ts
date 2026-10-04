/**
 * Which background suggestion belongs to which panel, and which ones were used or
 * dismissed, so a draft that finished while you were away shows once, in the right place.
 *
 * Browser storage can be blocked or cleared. Then this falls back to memory for the visit,
 * and the worst case is a dismissed draft showing again after a reload.
 */
import type { DraftPart } from "./api";

export type SlotKey = DraftPart | "highlights";

const SLOT_KEYS: readonly SlotKey[] = [
  "story",
  "expertise",
  "case_studies",
  "highlights",
];
const STORAGE_KEY = "tailr.website-suggestions";
const KEEP = 40;

interface Remembered {
  parts: Readonly<Record<string, SlotKey>>;
  closed: readonly string[];
}

let memory: Remembered = { parts: {}, closed: [] };

function isSlotKey(value: unknown): value is SlotKey {
  return SLOT_KEYS.includes(value as SlotKey);
}

function read(): Remembered {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as Partial<Remembered> | null;
    const parts = Object.entries(parsed?.parts ?? {}).filter(([, part]) =>
      isSlotKey(part),
    );
    const closed = Array.isArray(parsed?.closed)
      ? parsed.closed.filter((id): id is string => typeof id === "string")
      : [];
    return { parts: Object.fromEntries(parts), closed };
  } catch {
    return memory;
  }
}

function write(next: Remembered): void {
  memory = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage is blocked: memory keeps it for this visit.
  }
}

export function rememberPart(taskId: string, part: SlotKey): void {
  const current = read();
  const parts = Object.entries({ ...current.parts, [taskId]: part }).slice(
    -KEEP,
  );
  write({ ...current, parts: Object.fromEntries(parts) });
}

export function partOf(taskId: string): SlotKey | undefined {
  return read().parts[taskId];
}

export function markClosed(taskId: string): void {
  const current = read();
  if (current.closed.includes(taskId)) return;
  write({ ...current, closed: [...current.closed, taskId].slice(-KEEP) });
}

export function isClosed(taskId: string): boolean {
  return read().closed.includes(taskId);
}
