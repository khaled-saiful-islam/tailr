import { toast } from "sonner";
import type { Origin, Palette, ThemeChoice } from "@/app/appearance";
import { useTheme } from "@/app/theme-context";
import { useUpdateMe } from "@/features/auth/api";

/**
 * Change the theme or palette here and on the account at once. The look changes
 * straight away; if saving fails, it goes back and says why.
 */
export function useAppearance() {
  const theme = useTheme();
  const update = useUpdateMe();

  const save = (
    body: { theme: ThemeChoice } | { palette: Palette },
    undo: () => void,
  ) =>
    update.mutate(body, {
      onError: (error) => {
        undo();
        toast.error(`That didn't save: ${error.message}`);
      },
    });

  return {
    choice: theme.choice,
    resolved: theme.resolved,
    palette: theme.palette,
    chooseTheme: (next: ThemeChoice, origin?: Origin) => {
      if (next === theme.choice) return;
      const before = theme.choice;
      theme.setChoice(next, origin);
      save({ theme: next }, () => theme.setChoice(before));
    },
    choosePalette: (next: Palette, origin?: Origin) => {
      if (next === theme.palette) return;
      const before = theme.palette;
      theme.setPalette(next, origin);
      save({ palette: next }, () => theme.setPalette(before));
    },
  };
}
