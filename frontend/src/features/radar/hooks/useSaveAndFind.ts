import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useRunBrief } from "@/features/brief/api";
import type { SaveStatus } from "@/lib/useVersionedAutosave";
import { useSaveRadar, type CompleteSettings } from "../api";

interface Editor {
  settings: CompleteSettings | null;
  exists: boolean;
  status: SaveStatus;
  saveNow: () => void;
}

/**
 * "Save and find jobs": make sure the preferences are saved, start a search, then
 * go to the Jobs page, which shows the search as it runs. If the search can't start
 * (one is already running, or too many today), still go there and say why.
 */
export function useSaveAndFind(editor: Editor) {
  const { mutate: firstSave, isPending: savingFirst } = useSaveRadar();
  const { mutate: runSearch, isPending: starting } = useRunBrief();
  const navigate = useNavigate();
  const [waiting, setWaiting] = useState(false);

  const find = useCallback(() => {
    runSearch(undefined, {
      onSuccess: () => {
        toast.success(
          "Looking for jobs on LinkedIn and JobStreet. This takes about a minute.",
        );
        navigate("/jobs");
      },
      onError: (error) => {
        toast(error.message);
        navigate("/jobs");
      },
    });
  }, [runSearch, navigate]);

  // Edits autosave a moment after typing; wait for that before searching.
  useEffect(() => {
    if (!waiting) return;
    if (editor.status === "saved" || editor.status === "idle") {
      setWaiting(false);
      find();
    } else if (editor.status === "error" || editor.status === "conflict") {
      setWaiting(false);
      toast.error(
        "Your changes didn't save, so the search didn't start. Try again.",
      );
    }
  }, [waiting, editor.status, find]);

  const start = () => {
    const settings = editor.settings;
    if (!settings) return;
    if (settings.roles.length === 0) {
      toast.error("Add at least one job title first.");
      return;
    }
    if (!editor.exists) {
      firstSave(
        { settings, version: 0 },
        {
          onSuccess: () => find(),
          onError: (error) => toast.error(error.message),
        },
      );
      return;
    }
    if (editor.status === "saved" || editor.status === "idle") {
      find();
      return;
    }
    editor.saveNow();
    setWaiting(true);
  };

  return { start, busy: savingFirst || starting || waiting };
}
