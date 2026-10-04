import { compact, exact, purposeLabel } from "../format";

interface Use {
  purpose: string;
  tokens: number;
  calls: number;
}

/** What the AI was used for, biggest first, each with its share of the biggest. */
export function Purposes({ items }: { items: Use[] }) {
  if (!items.length)
    return (
      <p className="text-[0.9375rem] text-ink-3">
        No AI use in the last 30 days.
      </p>
    );
  const top = items[0]!.tokens || 1;
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.purpose}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[0.9375rem]">
            <span className="font-medium">{purposeLabel(item.purpose)}</span>
            <span className="text-ink-3">
              <span
                className="type-figure text-ink"
                title={`${exact(item.tokens)} tokens`}
              >
                {compact(item.tokens)}
              </span>{" "}
              tokens, {exact(item.calls)} {item.calls === 1 ? "call" : "calls"}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-chalk"
              style={{ width: `${Math.max((item.tokens / top) * 100, 1)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
