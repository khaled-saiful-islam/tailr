/** Pure helpers for the board: columns and drop positions. */
import type { Application } from "./api";
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
