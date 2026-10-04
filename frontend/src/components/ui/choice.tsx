import { Check, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Slider as RadixSlider } from "radix-ui";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { inputClass } from "./styles";

interface Option<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * Pill toggles for picking several options (or one, with `single`).
 * Selected pills fill with ink; the check makes the state clear without colour.
 */
export function ToggleChips<T extends string | number>({
  options,
  value,
  onChange,
  single = false,
  label,
}: {
  options: Option<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  single?: boolean;
  label: string;
}) {
  const toggle = (option: T) => {
    if (single) return onChange([option]);
    onChange(
      value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option],
    );
  };
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = value.includes(option.value);
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={on}
            title={option.hint}
            onClick={() => toggle(option.value)}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.875rem] font-medium transition-[background-color,border-color,color] duration-150",
              on
                ? "border-primary bg-primary text-primary-ink"
                : "border-line-strong bg-surface text-ink-2 hover:border-ink-3 hover:text-ink",
            )}
          >
            <AnimatePresence initial={false}>
              {on && (
                <motion.span
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <Check className="size-3.5" aria-hidden />
                </motion.span>
              )}
            </AnimatePresence>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Type a value and press Enter (or comma) to add it as a chip. */
export function ChipInput({
  label,
  value,
  onChange,
  placeholder,
  max = 20,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  max?: number;
  hint?: ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const id = useId();

  const add = (raw: string) => {
    const known = new Set(value.map((v) => v.toLowerCase()));
    const fresh = raw
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v && !known.has(v.toLowerCase()));
    if (fresh.length) onChange([...value, ...fresh].slice(0, max));
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === "Enter" || event.key === ",") && draft.trim()) {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="type-label">
        {label}
      </label>
      <div
        className={cn(
          inputClass,
          "flex min-h-11 flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-chalk focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--chalk)_22%,transparent)]",
        )}
      >
        <AnimatePresence initial={false}>
          {value.map((item) => (
            <motion.span
              key={item}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-3 pr-1 text-[0.875rem] font-medium"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== item))}
                aria-label={`Remove ${item}`}
                className="grid size-5 place-items-center rounded-full text-ink-3 hover:bg-pin-soft hover:text-pin"
              >
                <X className="size-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={value.length ? "" : placeholder}
          disabled={value.length >= max}
          className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-[0.9375rem] outline-none placeholder:text-ink-3"
        />
      </div>
      {hint ? <p className="text-[0.8125rem] text-ink-3">{hint}</p> : null}
    </div>
  );
}

/** A single-value slider with the value shown beside its label. */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="type-label">{label}</span>
        <span className="type-figure text-[1.0625rem]">{format(value)}</span>
      </div>
      <RadixSlider.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => next !== undefined && onChange(next)}
        className="relative flex h-6 touch-none select-none items-center"
        aria-label={label}
      >
        <RadixSlider.Track className="relative h-2 grow overflow-hidden rounded-full bg-surface-3">
          <RadixSlider.Range className="absolute h-full rounded-full bg-tape" />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          aria-valuetext={format(value)}
          className="block size-6 rounded-full border-2 border-ink bg-surface shadow-sheet transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-chalk"
        />
      </RadixSlider.Root>
    </div>
  );
}

/** One of a few options, side by side. Arrow keys move between them. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    const radios =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        "[role=radio]",
      );
    radios?.[options.indexOf(next)]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-control bg-surface-2 p-1"
    >
      {options.map((option, index) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            title={option.hint}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "rounded-[7px] font-medium transition-[background-color,color,box-shadow] duration-150",
              size === "sm"
                ? "h-7 px-2.5 text-[0.8125rem]"
                : "h-8 px-3.5 text-[0.875rem]",
              on
                ? "bg-surface text-ink shadow-[0_1px_2px_rgb(20_33_61/0.12)]"
                : "text-ink-2 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
