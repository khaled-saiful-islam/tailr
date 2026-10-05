import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applyToDocument,
  isPalette,
  isThemeChoice,
  PALETTE_KEY,
  readStored,
  resolveTheme,
  store,
  THEME_KEY,
  transition,
  type Origin,
  type Palette,
  type ThemeChoice,
} from "./appearance";
import { ThemeContext } from "./theme-context";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Applies light/dark and the palette to <html data-theme data-palette>, and follows the
 * device when the theme is "system".
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(() =>
    readStored(THEME_KEY, isThemeChoice, "system"),
  );
  const [palette, setPaletteState] = useState<Palette>(() =>
    readStored(PALETTE_KEY, isPalette, "tape"),
  );
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const current = useRef({ choice, palette, systemDark });
  current.current = { choice, palette, systemDark };

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved = resolveTheme(choice, systemDark);

  useEffect(() => {
    applyToDocument(resolved, palette);
  }, [resolved, palette]);

  const setChoice = useCallback((next: ThemeChoice, origin?: Origin) => {
    const now = current.current;
    if (next === now.choice) return;
    store(THEME_KEY, next);
    transition(() => {
      applyToDocument(resolveTheme(next, now.systemDark), now.palette);
      setChoiceState(next);
    }, origin);
  }, []);

  const setPalette = useCallback((next: Palette, origin?: Origin) => {
    const now = current.current;
    if (next === now.palette) return;
    store(PALETTE_KEY, next);
    transition(() => {
      applyToDocument(resolveTheme(now.choice, now.systemDark), next);
      setPaletteState(next);
    }, origin);
  }, []);

  const value = useMemo(
    () => ({ choice, resolved, palette, setChoice, setPalette }),
    [choice, resolved, palette, setChoice, setPalette],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
