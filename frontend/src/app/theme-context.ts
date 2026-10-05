import { createContext, useContext } from "react";
import type { Origin, Palette, Resolved, ThemeChoice } from "./appearance";

export type { Palette, ThemeChoice } from "./appearance";

export interface ThemeContextValue {
  choice: ThemeChoice;
  resolved: Resolved;
  palette: Palette;
  /** With an origin, the change animates out from there; without, it's instant. */
  setChoice: (choice: ThemeChoice, origin?: Origin) => void;
  setPalette: (palette: Palette, origin?: Origin) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
