import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useUpdateApplication, type ApplicationUpdate } from "./api";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Saves edits to one application a moment after typing stops. Anything still waiting
 * when the sheet closes is sent straight away, so nothing typed is lost.
 */
export function useFieldSave(id: string) {
  const update = useUpdateApplication();
  const mutate = useRef(update.mutate);
  mutate.current = update.mutate;
  const pending = useRef(
    new Map<string, { patch: ApplicationUpdate; timer: number }>(),
  );
  const [state, setState] = useState<SaveState>("idle");

  const send = useCallback(
    (patch: ApplicationUpdate) => {
      setState("saving");
      mutate.current(
        { id, ...patch },
        {
          onSuccess: () => setState("saved"),
          onError: (error) => {
            setState("error");
            toast.error(error.message);
          },
        },
      );
    },
    [id],
  );

  const save = useCallback(
    (patch: ApplicationUpdate, delay = 700) => {
      const key = Object.keys(patch).sort().join(",");
      const waiting = pending.current.get(key);
      if (waiting) window.clearTimeout(waiting.timer);
      const timer = window.setTimeout(() => {
        pending.current.delete(key);
        send(patch);
      }, delay);
      pending.current.set(key, { patch, timer });
    },
    [send],
  );

  useEffect(() => {
    const waiting = pending.current;
    return () => {
      waiting.forEach(({ patch, timer }) => {
        window.clearTimeout(timer);
        send(patch);
      });
      waiting.clear();
    };
  }, [send]);

  return { save, state };
}
