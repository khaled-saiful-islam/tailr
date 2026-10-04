import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError } from "@/lib/api/client";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error" | "conflict";

interface Loaded<T> {
  value: T;
  version: number;
}

interface Options<TServer, T> {
  /** The latest server answer (from a query). */
  data: TServer | undefined;
  /** Turn a server answer into the local value and its version. */
  read: (server: TServer) => Loaded<T>;
  /** Persist; must call back with the server's new version. */
  save: (
    body: Loaded<T>,
    callbacks: { onSuccess: (version: number) => void; onError: (error: unknown) => void },
  ) => void;
  /** Fetch the server's current answer again (used after a conflict). */
  refetch: () => Promise<TServer | undefined>;
  /** When false, edits wait for `saveNow` (e.g. before the first explicit save). */
  autosave?: boolean;
  debounceMs?: number;
}

/**
 * Local-first editing with versioned autosave.
 *
 * The local value is the source of truth while you edit; changes are saved after
 * a short pause. Each save carries the version it was based on, so an edit in
 * another tab is never silently overwritten (status "conflict").
 */
export function useVersionedAutosave<TServer, T>({
  data,
  read,
  save,
  refetch,
  autosave = true,
  debounceMs = 900,
}: Options<TServer, T>) {
  const [value, setValue] = useState<T | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const version = useRef(0);
  const dirty = useRef(false);
  const inFlight = useRef(false);
  const latest = useRef<T | null>(null);
  const readRef = useRef(read);
  const saveRef = useRef(save);
  useEffect(() => {
    readRef.current = read;
    saveRef.current = save;
  });

  // Load once; later server answers must not overwrite what you're typing.
  useEffect(() => {
    if (data !== undefined && latest.current === null) {
      const loaded = readRef.current(data);
      latest.current = loaded.value;
      version.current = loaded.version;
      setValue(loaded.value);
    }
  }, [data]);

  const flush = useCallback(() => {
    const current = latest.current;
    if (current === null || !dirty.current || inFlight.current) return;
    dirty.current = false;
    inFlight.current = true;
    setStatus("saving");
    saveRef.current(
      { value: current, version: version.current },
      {
        onSuccess: (nextVersion) => {
          version.current = nextVersion;
          inFlight.current = false;
          if (dirty.current) {
            setStatus("pending");
            window.setTimeout(() => flushRef.current(), 0);
          } else {
            setStatus("saved");
          }
        },
        onError: (error) => {
          inFlight.current = false;
          dirty.current = true;
          setStatus(isApiError(error, "version_conflict") ? "conflict" : "error");
        },
      },
    );
  }, []);
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(() => {
    // After an error, wait for the next edit or an explicit retry instead of looping.
    if (!autosave || !dirty.current || status === "conflict" || status === "error") return;
    const timer = window.setTimeout(flush, debounceMs);
    return () => window.clearTimeout(timer);
  }, [value, flush, status, autosave, debounceMs]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (autosave && (dirty.current || inFlight.current)) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [autosave]);

  const update = useCallback((recipe: (current: T) => T) => {
    setValue((current) => {
      if (current === null) return current;
      const next = recipe(current);
      latest.current = next;
      dirty.current = true;
      return next;
    });
    setStatus((current) => (current === "conflict" ? current : "pending"));
  }, []);

  /** Save immediately (also used for a first, explicit save). */
  const saveNow = useCallback(() => {
    dirty.current = true;
    flush();
  }, [flush]);

  /** Throw away local edits and load what the server has. */
  const reload = useCallback(async () => {
    const fresh = await refetch();
    if (fresh !== undefined) {
      const loaded = readRef.current(fresh);
      latest.current = loaded.value;
      version.current = loaded.version;
      dirty.current = false;
      setValue(loaded.value);
      setStatus("idle");
    }
  }, [refetch]);

  return { value, update, status, retry: flush, saveNow, reload };
}
