/** Small pieces shared by the interview cards: the kind tag, marks, and your story. */
import { Check, CircleDot, Quote } from "lucide-react";
import type { FactRef } from "../api";
import { sourcesFor } from "../edit";
import { cn } from "@/lib/cn";
import type { Mark, Story } from "./api";
import { KIND_LABEL, type Card } from "./model";

const KIND_TONE: Record<Card["kind"], string> = {
  role: "bg-chalk-soft text-chalk",
  experience:
    "bg-[color-mix(in_oklab,var(--fit-strong)_13%,transparent)] text-fit-strong",
  gap: "bg-[color-mix(in_oklab,var(--fit-stretch)_15%,transparent)] text-fit-stretch",
  situational: "bg-surface-2 text-ink-2",
  motivation: "bg-[color-mix(in_oklab,var(--tape)_26%,transparent)] text-ink",
  likely: "bg-surface-2 text-ink-2",
};

export function KindTag({ kind }: { kind: Card["kind"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold",
        KIND_TONE[kind],
      )}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

/** "I'm confident" / "Needs practice": press again to clear. */
export function MarkButtons({
  mark,
  onMark,
  keys = false,
}: {
  mark: Mark | undefined;
  onMark: (mark: Mark | null) => void;
  keys?: boolean;
}) {
  const options: { value: Mark; label: string; key: string }[] = [
    { value: "confident", label: "I'm confident", key: "C" },
    { value: "practice", label: "Needs practice", key: "P" },
  ];
  return (
    <div
      role="group"
      aria-label="How ready you feel"
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const on = mark === option.value;
        const Icon = option.value === "confident" ? Check : CircleDot;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            aria-keyshortcuts={keys ? option.key : undefined}
            onClick={() => onMark(on ? null : option.value)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.875rem] font-semibold transition-colors",
              on && option.value === "confident"
                ? "border-fit-strong bg-fit-strong text-surface"
                : on
                  ? "border-fit-stretch bg-fit-stretch text-surface"
                  : "border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {option.label}
            {keys && (
              <kbd className="ml-0.5 hidden rounded border border-current/30 px-1 text-[0.6875rem] font-medium opacity-70 sm:inline">
                {option.key}
              </kbd>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Sources({
  factIds,
  facts,
}: {
  factIds: string[];
  facts: FactRef[];
}) {
  const sources = sourcesFor(factIds, facts);
  if (!sources.length) return null;
  return (
    <div className="mt-3 flex gap-1.5 text-[0.8125rem] text-ink-3">
      <Quote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <p>
        <span className="font-medium">From your profile: </span>
        {sources.map((s) => `${s.text} (${s.owner})`).join(" / ")}
      </p>
    </div>
  );
}

const STAR: {
  key: keyof Omit<Story, "fact_ids">;
  letter: string;
  label: string;
}[] = [
  { key: "situation", letter: "S", label: "Situation" },
  { key: "task", letter: "T", label: "Task" },
  { key: "action", letter: "A", label: "Action" },
  { key: "result", letter: "R", label: "Result" },
];

/** Your story as Situation, Task, Action, Result, with the profile lines it comes from. */
export function StoryBlock({ card, facts }: { card: Card; facts: FactRef[] }) {
  if (card.story)
    return (
      <div>
        <ol className="flex flex-col gap-2.5">
          {STAR.map((part) => (
            <li key={part.key} className="flex gap-3">
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-full bg-chalk-soft text-[0.8125rem] font-bold text-chalk"
              >
                {part.letter}
              </span>
              <p className="pt-0.5 leading-relaxed">
                <span className="sr-only">{part.label}: </span>
                {card.story?.[part.key]}
              </p>
            </li>
          ))}
        </ol>
        <Sources factIds={card.factIds} facts={facts} />
      </div>
    );
  if (card.storyText)
    return (
      <div>
        <p className="leading-relaxed">{card.storyText}</p>
        <Sources factIds={card.factIds} facts={facts} />
      </div>
    );
  return (
    <p className="text-ink-2">
      {card.kind === "gap"
        ? "Your profile has no direct story for this. That's fine: say so plainly, then bridge from the closest work you've done and how you'd get up to speed."
        : "No story from your profile fits this one. Answer from what the job ad says, and keep it short."}
    </p>
  );
}
