import { useEffect, useRef } from "react";
import { useTheme } from "@/app/theme-context";
import { useMe } from "@/features/auth/api";

/**
 * The theme and palette saved on the account win over this browser's choice, once per sign-in:
 * someone who picked dark on their laptop gets dark on a new phone too. After that,
 * choices made here are saved to the account, so the two stay the same.
 */
export function useSyncAccountTheme(): void {
  const { data: user } = useMe();
  const { choice, palette, setChoice, setPalette } = useTheme();
  const adopted = useRef<string | null>(null);

  useEffect(() => {
    if (!user || adopted.current === user.id) return;
    adopted.current = user.id;
    if (user.theme !== choice) setChoice(user.theme);
    if (user.palette !== palette) setPalette(user.palette);
  }, [user, choice, palette, setChoice, setPalette]);
}
