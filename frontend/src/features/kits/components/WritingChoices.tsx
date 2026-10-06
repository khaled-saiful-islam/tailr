import {
  Check,
  HeartHandshake,
  Scissors,
  Target,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import type { Language, Tone } from "../api";
import { LANGUAGE_OPTIONS, TONE_OPTIONS } from "../options";

/**
 * One look for "this is your choice" in both groups: the accent border, a light tint and
 * a check. Colour never means anything else here, so the pick reads at a glance.
 */
const PICKED =
  "border-chalk bg-[color-mix(in_oklab,var(--chalk)_8%,var(--surface))]";
const UNPICKED = "border-line hover:border-line-strong";

/** Each tone keeps its own icon, so the three are easy to tell apart. */
const TONE_ICON: Record<Tone, LucideIcon> = {
  confident: Target,
  warm: HeartHandshake,
  concise: Scissors,
};

const card =
  "relative flex h-full cursor-pointer flex-col gap-1.5 rounded-control border-2 bg-surface p-3.5 transition-[border-color,background-color] duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-chalk has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60";

function Picked({ on }: { on: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {on && (
        <motion.span
          aria-hidden
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 22 }}
          className="absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full bg-chalk text-canvas"
        >
          <Check className="size-3" strokeWidth={3} />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function NowTag() {
  return (
    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[0.75rem] font-medium text-ink-2">
      Now
    </span>
  );
}

export function LanguageChoice({
  value,
  current,
  disabled,
  onChange,
}: {
  value: Language;
  current: Language;
  disabled: boolean;
  onChange: (value: Language) => void;
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="type-label text-ink-2">Language</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {LANGUAGE_OPTIONS.map((option) => {
          const on = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                card,
                "flex-row items-center gap-3 pr-9",
                on ? PICKED : UNPICKED,
              )}
            >
              <input
                type="radio"
                name="language"
                value={option.value}
                checked={on}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-[8px] text-[0.8125rem] font-bold transition-colors duration-200",
                  on ? "bg-chalk-soft text-chalk" : "bg-surface-2 text-ink-2",
                )}
              >
                {option.short}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  {option.label}
                  {option.value === current && <NowTag />}
                </span>
                <span className="block text-[0.8125rem] text-ink-2">
                  {option.hint}
                </span>
              </span>
              <Picked on={on} />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ToneChoice({
  value,
  current,
  disabled,
  onChange,
}: {
  value: Tone;
  current: Tone;
  disabled: boolean;
  onChange: (value: Tone) => void;
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="type-label text-ink-2">Tone</legend>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        {TONE_OPTIONS.map((option) => {
          const on = value === option.value;
          const Icon = TONE_ICON[option.value];
          return (
            <label
              key={option.value}
              className={cn(card, "pr-9", on ? PICKED : UNPICKED)}
            >
              <input
                type="radio"
                name="tone"
                value={option.value}
                checked={on}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="flex flex-wrap items-center gap-2.5 font-semibold">
                <span
                  aria-hidden
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-200",
                    on ? "bg-chalk-soft text-chalk" : "bg-surface-2 text-ink-2",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                {option.label}
                {option.value === current && <NowTag />}
              </span>
              <span className="text-[0.875rem] text-ink-2">{option.hint}</span>
              <span
                className={cn(
                  "mt-auto pt-1 text-[0.8125rem] italic text-ink-3",
                  !on && "hidden md:block",
                )}
              >
                <span className="sr-only">For example: </span>"{option.sample}"
              </span>
              <Picked on={on} />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
