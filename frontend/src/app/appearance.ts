/**
 * Appearance: light, dark or the device's choice, and one of four colour palettes.
 * Both are kept in this browser (so the first paint is right) and on the account (so
 * they follow you to every device).
 */
import { flushSync } from "react-dom";

export type ThemeChoice = "system" | "light" | "dark";
export type Palette = "tape" | "lagoon" | "orchid" | "fern";
export type Resolved = "light" | "dark";

export const THEME_KEY = "tailr.theme";
export const PALETTE_KEY = "tailr.palette";

export const PALETTES: readonly { value: Palette; label: string }[] = [
  { value: "tape", label: "Classic" },
  { value: "lagoon", label: "Lagoon" },
  { value: "orchid", label: "Orchid" },
  { value: "fern", label: "Fern" },
];

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

export function isPalette(value: unknown): value is Palette {
  return PALETTES.some((palette) => palette.value === value);
}

export function resolveTheme(
  choice: ThemeChoice,
  systemDark: boolean,
): Resolved {
  return choice === "system" ? (systemDark ? "dark" : "light") : choice;
}

export function readStored<T>(
  key: string,
  valid: (value: unknown) => value is T,
  fallback: T,
): T {
  try {
    const value = localStorage.getItem(key);
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode: the choice still applies for this visit.
  }
}

/** Put the theme and palette on <html>, and tint the browser's own bar to match. */
export function applyToDocument(resolved: Resolved, palette: Palette): void {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.palette = palette;
  const canvas = getComputedStyle(root).getPropertyValue("--canvas").trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && canvas) meta.setAttribute("content", canvas);
}

export interface Origin {
  x: number;
  y: number;
}

/** How far the reveal circle must grow from `origin` to cover the window. */
export function revealRadius(
  origin: Origin,
  width: number,
  height: number,
): number {
  return Math.hypot(
    Math.max(origin.x, width - origin.x),
    Math.max(origin.y, height - origin.y),
  );
}

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

const FADE_MS = 360;

/**
 * Change the look with a little ceremony: the new colours spread from the control as a
 * circle where the browser can, and ease across everywhere else. Instant without an
 * origin (adopting the account's choice) or when motion is reduced.
 */
export function transition(update: () => void, origin?: Origin): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!origin || reduced) {
    update();
    return;
  }
  const doc = document as TransitionDocument;
  if (typeof doc.startViewTransition === "function") {
    const view = doc.startViewTransition(() => flushSync(update));
    view.ready
      .then(() => {
        const radius = revealRadius(
          origin,
          window.innerWidth,
          window.innerHeight,
        );
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${origin.x}px ${origin.y}px)`,
              `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
            ],
          },
          {
            duration: 520,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => undefined);
    return;
  }
  const root = document.documentElement;
  root.classList.add("theme-fading");
  update();
  window.setTimeout(() => root.classList.remove("theme-fading"), FADE_MS);
}

/** Where a click happened, as the starting point of the reveal. */
export function originOf(event: {
  clientX: number;
  clientY: number;
  currentTarget: EventTarget | null;
}): Origin {
  if (event.clientX || event.clientY)
    return { x: event.clientX, y: event.clientY };
  // Keyboard: start from the middle of the control instead.
  const element = event.currentTarget as Element | null;
  const box = element?.getBoundingClientRect();
  return box
    ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
    : { x: window.innerWidth / 2, y: 0 };
}
