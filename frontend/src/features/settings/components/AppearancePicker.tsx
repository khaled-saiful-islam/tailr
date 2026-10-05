import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { useId, type KeyboardEvent, type MouseEvent } from "react";
import {
  originOf,
  PALETTES,
  type Origin,
  type Palette,
  type ThemeChoice,
} from "@/app/appearance";
import { cn } from "@/lib/cn";
import { useAppearance } from "../useAppearance";

const THEMES: { value: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match my device", icon: Monitor },
];

/** Arrow keys move through a radio group and choose as they go, like native radios. */
function arrowTo<T>(
  event: KeyboardEvent<HTMLButtonElement>,
  values: readonly T[],
  index: number,
  choose: (value: T, origin: Origin) => void,
) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
    event.key
  ];
  if (!step) return;
  event.preventDefault();
  const nextIndex = (index + step + values.length) % values.length;
  const radios =
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      "[role=radio]",
    );
  const next = radios?.[nextIndex];
  next?.focus();
  const box = next?.getBoundingClientRect();
  choose(
    values[nextIndex] as T,
    box
      ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
      : { x: 0, y: 0 },
  );
}

/**
 * Light, dark or the device's setting, and the colours: one control for the shell's
 * quick menu and for Settings. Changes apply at once and follow you to every device.
 */
export function AppearancePicker({ className }: { className?: string }) {
  const { choice, palette, chooseTheme, choosePalette } = useAppearance();
  const group = useId();
  const themeLabel = `${group}-theme`;
  const paletteLabel = `${group}-palette`;
  const click =
    <T,>(choose: (value: T, origin: Origin) => void, value: T) =>
    (event: MouseEvent<HTMLButtonElement>) =>
      choose(value, originOf(event));

  return (
    <LayoutGroup id={group}>
      <div className={cn("flex flex-col gap-5", className)}>
        <div>
          <p id={themeLabel} className="type-label text-ink-2">
            Theme
          </p>
          <div
            role="radiogroup"
            aria-labelledby={themeLabel}
            className="mt-2 grid grid-cols-3 gap-1 rounded-control bg-surface-2 p-1"
          >
            {THEMES.map((theme, index) => {
              const on = theme.value === choice;
              return (
                <button
                  key={theme.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  onClick={click(chooseTheme, theme.value)}
                  onKeyDown={(event) =>
                    arrowTo(
                      event,
                      THEMES.map((t) => t.value),
                      index,
                      chooseTheme,
                    )
                  }
                  className={cn(
                    "press relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 rounded-[8px] px-1.5 py-2 text-center text-[0.8125rem] font-semibold leading-tight transition-colors",
                    on ? "text-ink" : "text-ink-2 hover:text-ink",
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId="theme-pill"
                      className="absolute inset-0 rounded-[8px] bg-surface shadow-sheet dark:bg-surface-3"
                      transition={{
                        type: "spring",
                        stiffness: 480,
                        damping: 36,
                      }}
                    />
                  )}
                  <motion.span
                    className="relative"
                    animate={
                      on ? { rotate: [0, -18, 0], scale: [1, 1.15, 1] } : {}
                    }
                    transition={{ duration: 0.45 }}
                  >
                    <theme.icon className="size-[18px]" aria-hidden />
                  </motion.span>
                  <span className="relative">{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p id={paletteLabel} className="type-label text-ink-2">
            Colours
          </p>
          <div
            role="radiogroup"
            aria-labelledby={paletteLabel}
            className="mt-2 grid grid-cols-4 gap-2"
          >
            {PALETTES.map((option, index) => {
              const on = option.value === palette;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  onClick={click(choosePalette, option.value)}
                  onKeyDown={(event) =>
                    arrowTo<Palette>(
                      event,
                      PALETTES.map((p) => p.value),
                      index,
                      choosePalette,
                    )
                  }
                  className="group flex flex-col items-center gap-1.5 rounded-[10px] px-1 py-1.5 text-[0.8125rem] font-medium leading-tight text-ink-2 hover:text-ink aria-checked:text-ink"
                >
                  <span
                    data-swatch={option.value}
                    className={cn(
                      "swatch relative grid size-10 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-[box-shadow,transform] duration-200 ease-tailor group-hover:scale-105 group-active:scale-95",
                      on ? "ring-2 ring-ink" : "ring-1 ring-line-strong",
                    )}
                  >
                    {on && (
                      <motion.span
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 520,
                          damping: 26,
                        }}
                        className="grid size-5 place-items-center rounded-full bg-surface text-ink shadow-sheet"
                      >
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </motion.span>
                    )}
                  </span>
                  <span className="text-center">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </LayoutGroup>
  );
}
