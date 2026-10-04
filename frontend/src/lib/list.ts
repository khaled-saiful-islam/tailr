/** Immutable list helpers for items with an `id`. Each returns a new array. */

export function updateById<T extends { id: string }>(
  items: readonly T[],
  id: string,
  patch: Partial<T>,
): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function removeById<T extends { id: string }>(
  items: readonly T[],
  id: string,
): T[] {
  return items.filter((item) => item.id !== id);
}

export function move<T>(items: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

export function moveById<T extends { id: string }>(
  items: readonly T[],
  id: string,
  delta: -1 | 1,
): T[] {
  const index = items.findIndex((item) => item.id === id);
  return index < 0 ? [...items] : move(items, index, index + delta);
}
