import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError } from "@/lib/api/client";
import { useProfile, useSaveProfile } from "../api";
import { normalize, toApi, type ProfileDoc } from "../types";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error" | "conflict";

const DEBOUNCE_MS = 900;

/**
 * Local-first editing with autosave.
 *
 * The local document is the source of truth while you edit; each change is
 * saved after a short pause. Saves carry the version they were based on, so a
 * change made in another tab is never silently overwritten (status "conflict").
 */
export function useProfileEditor() {
  const query = useProfile();
  const { mutate: saveProfile } = useSaveProfile();
  const [doc, setDoc] = useState<ProfileDoc | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const version = useRef(0);
  const dirty = useRef(false);
  const inFlight = useRef(false);
  const latest = useRef<ProfileDoc | null>(null);

  // Load once; later server answers must not overwrite what you're typing.
  useEffect(() => {
    if (query.data && latest.current === null) {
      const loaded = normalize(query.data.document);
      latest.current = loaded;
      version.current = query.data.version;
      setDoc(loaded);
    }
  }, [query.data]);

  const flush = useCallback(() => {
    const current = latest.current;
    if (!current || !dirty.current || inFlight.current) return;
    dirty.current = false;
    inFlight.current = true;
    setStatus("saving");
    saveProfile(
      { document: toApi(current), version: version.current },
      {
        onSuccess: (profile) => {
          version.current = profile.version;
          inFlight.current = false;
          if (dirty.current) {
            setStatus("pending");
            window.setTimeout(flush, 0);
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
  }, [saveProfile]);

  useEffect(() => {
    // After an error, wait for the next edit or an explicit retry instead of looping.
    if (!dirty.current || status === "conflict" || status === "error") return;
    const timer = window.setTimeout(flush, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [doc, flush, status]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current || inFlight.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const update = useCallback((recipe: (current: ProfileDoc) => ProfileDoc) => {
    setDoc((current) => {
      if (!current) return current;
      const next = recipe(current);
      latest.current = next;
      dirty.current = true;
      return next;
    });
    setStatus((current) => (current === "conflict" ? current : "pending"));
  }, []);

  /** Throw away local edits and load what the server has (after a conflict). */
  const reload = useCallback(async () => {
    const fresh = await query.refetch();
    if (fresh.data) {
      const loaded = normalize(fresh.data.document);
      latest.current = loaded;
      version.current = fresh.data.version;
      dirty.current = false;
      setDoc(loaded);
      setStatus("idle");
    }
  }, [query]);

  return {
    doc,
    update,
    status,
    retry: flush,
    reload,
    strength: query.data?.strength,
    exists: query.data?.exists ?? false,
    isLoading: query.isPending,
    error: query.error,
  };
}
