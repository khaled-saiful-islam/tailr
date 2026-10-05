import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyToDocument,
  isPalette,
  isThemeChoice,
  PALETTE_KEY,
  readStored,
  resolveTheme,
  revealRadius,
  THEME_KEY,
} from "../appearance";
import { ThemeProvider } from "../theme";
import { useTheme } from "../theme-context";

function mockMedia(matches: { dark?: boolean; reduced?: boolean } = {}) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("reduce")
        ? Boolean(matches.reduced)
        : Boolean(matches.dark),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.palette;
  mockMedia();
});

afterEach(() => vi.unstubAllGlobals());

describe("appearance rules", () => {
  it("knows the four palettes and three theme choices", () => {
    expect(["tape", "lagoon", "orchid", "fern"].every(isPalette)).toBe(true);
    expect(isPalette("neon")).toBe(false);
    expect(isThemeChoice("system")).toBe(true);
    expect(isThemeChoice("sepia")).toBe(false);
  });

  it("follows the device only when asked to", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("ignores stored nonsense and falls back", () => {
    localStorage.setItem(PALETTE_KEY, "neon");
    expect(readStored(PALETTE_KEY, isPalette, "tape")).toBe("tape");
    localStorage.setItem(PALETTE_KEY, "fern");
    expect(readStored(PALETTE_KEY, isPalette, "tape")).toBe("fern");
  });

  it("grows the reveal far enough to cover the window from any corner", () => {
    expect(revealRadius({ x: 0, y: 0 }, 300, 400)).toBe(500);
    expect(revealRadius({ x: 150, y: 200 }, 300, 400)).toBe(250);
  });

  it("puts the theme and palette on the page", () => {
    applyToDocument("dark", "orchid");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.palette).toBe("orchid");
  });
});

function Probe() {
  const { palette, resolved, setPalette, setChoice } = useTheme();
  return (
    <div>
      <p>
        {resolved} {palette}
      </p>
      <button onClick={() => setPalette("lagoon")}>lagoon</button>
      <button onClick={() => setChoice("dark", { x: 10, y: 10 })}>dark</button>
    </div>
  );
}

describe("the theme provider", () => {
  it("starts from what this browser saved", () => {
    localStorage.setItem(THEME_KEY, "dark");
    localStorage.setItem(PALETTE_KEY, "fern");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText("dark fern")).toBeInTheDocument();
    expect(document.documentElement.dataset.palette).toBe("fern");
  });

  it("changes palette and theme at once and remembers them", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    act(() => screen.getByText("lagoon").click());
    expect(screen.getByText("light lagoon")).toBeInTheDocument();
    expect(document.documentElement.dataset.palette).toBe("lagoon");
    expect(localStorage.getItem(PALETTE_KEY)).toBe("lagoon");

    // No view transitions here: the colours ease across, then the class goes.
    vi.useFakeTimers();
    act(() => screen.getByText("dark").click());
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("theme-fading")).toBe(
      true,
    );
    act(() => vi.runAllTimers());
    expect(document.documentElement.classList.contains("theme-fading")).toBe(
      false,
    );
    vi.useRealTimers();
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });
});
