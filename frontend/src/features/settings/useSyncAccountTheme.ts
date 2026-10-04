import { useEffect, useRef } from "react";
import { useTheme } from "@/app/theme-context";
import { useMe } from "@/features/auth/api";

/**
 * The theme saved on the account wins over this browser's choice, once per sign-in:
 * someone who picked dark on their laptop gets dark on a new phone too. After that,
 * choices made here are saved to the account, so the two stay the same.
 */
export function useSyncAccountTheme(): void {
  const { data: user } = useMe();
  const { choice, setChoice } = useTheme();
  const adopted = useRef<string | null>(null);

  useEffect(() => {
    if (!user || adopted.current === user.id) return;
    adopted.current = user.id;
    if (user.theme !== choice) setChoice(user.theme);
  }, [user, choice, setChoice]);
}
