/** The end of the interview: questions to ask them. And a checklist for the day before. */
import { Check, MessageCircleQuestion } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Plan } from "./api";

const storageKey = (kitId: string) => `tailr.interview.checklist.${kitId}`;

function readTicked(kitId: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey(kitId));
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function writeTicked(kitId: string, ticked: string[]): void {
  try {
    window.localStorage.setItem(storageKey(kitId), JSON.stringify(ticked));
  } catch {
    // Storage blocked: the ticks last for this visit.
  }
}

export function AskThem({ kitId, plan }: { kitId: string; plan: Plan }) {
  const [ticked, setTicked] = useState(() => readTicked(kitId));
  const toggle = (item: string) => {
    const next = ticked.includes(item)
      ? ticked.filter((t) => t !== item)
      : [...ticked, item];
    setTicked(next);
    writeTicked(kitId, next);
  };

  const askThem = plan.ask_them ?? [];
  const checklist = plan.checklist ?? [];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {askThem.length > 0 && (
        <section
          aria-labelledby="ask-them-heading"
          className="rounded-panel border border-line bg-surface p-5"
        >
          <h3
            id="ask-them-heading"
            className="type-heading flex items-center gap-2"
          >
            <MessageCircleQuestion
              className="size-5 shrink-0 text-chalk"
              aria-hidden
            />
            Questions to ask them
          </h3>
          <p className="mt-1 text-[0.9375rem] text-ink-2">
            Asking good questions shows you've thought about the job. Pick two
            or three.
          </p>
          <ul className="mt-4 flex flex-col gap-3.5">
            {askThem.map((item) => (
              <li key={item.question}>
                <p className="font-semibold leading-snug">{item.question}</p>
                <p className="mt-0.5 text-[0.875rem] text-ink-2">{item.why}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {checklist.length > 0 && (
        <section
          aria-labelledby="checklist-heading"
          className="rounded-panel border border-line bg-surface p-5"
        >
          <h3 id="checklist-heading" className="type-heading">
            Before the day
          </h3>
          <p className="mt-1 text-[0.9375rem] text-ink-2">
            Tick them off as you go. Saved in this browser.
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {checklist.map((item) => {
              const done = ticked.includes(item);
              return (
                <li key={item}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    onClick={() => toggle(item)}
                    className="flex w-full gap-3 rounded-control p-1.5 text-left hover:bg-surface-2"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px] border transition-colors",
                        done
                          ? "border-fit-strong bg-fit-strong text-surface"
                          : "border-line-strong",
                      )}
                    >
                      {done && <Check className="size-3.5" />}
                    </span>
                    <span className={cn(done && "text-ink-3 line-through")}>
                      {item}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
