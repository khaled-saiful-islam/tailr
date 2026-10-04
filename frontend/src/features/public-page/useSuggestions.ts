/**
 * AI suggestions for My website, run in the background. Each panel (your story, what you
 * do, case studies, key numbers) starts its own; the editor keeps them, so switching tabs
 * loses nothing, and a suggestion that finished while you were away comes back for an hour.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { toast } from "sonner";
import {
  isActive,
  useBackgroundTask,
  useLatestTask,
  type Task,
} from "@/features/tasks/api";
import { startDraft, startHighlights } from "./api";
import {
  isClosed,
  markClosed,
  partOf,
  rememberPart,
  type SlotKey,
} from "./remembered";
import {
  asDraft,
  asHighlights,
  guessPart,
  hasContent,
  isFresh,
  NOTHING,
  type SlotValues,
} from "./suggestionResults";

const GENERIC_FAILURE = "Something went wrong. Please try again.";

type Shown = { [K in SlotKey]?: { taskId: string; value: SlotValues[K] } };

export interface Slot<T> {
  /** Working on it now: started here, or before you left the page. */
  running: boolean;
  /** What's happening now, in plain words. */
  stage: string | null;
  /** The finished suggestion, until it's used or dismissed. */
  value: T | null;
  start: () => void;
  /** Used or dismissed: it won't come back. */
  close: () => void;
  /** Keep the suggestion with part of it taken (one case study used, others waiting). */
  replace: (value: T) => void;
}

function slotOf(task: Task): SlotKey | undefined {
  if (task.kind === "website.highlights") return "highlights";
  return partOf(task.id) ?? guessPart(task.result);
}

/** Start one kind of suggestion and hand its result over when it's done. */
function useRunner(
  key: SlotKey,
  begin: () => Promise<Task>,
  started: MutableRefObject<ReadonlySet<string>>,
  settle: (key: SlotKey, task: Task) => void,
) {
  return useBackgroundTask<void, unknown>(
    async () => {
      const task = await begin();
      started.current = new Set([...started.current, task.id]);
      rememberPart(task.id, key);
      return task;
    },
    {
      onDone: (_result, task) => settle(key, task),
      onFailed: (message) => toast.error(message),
    },
  );
}

export function useSuggestions() {
  const [shown, setShown] = useState<Shown>({});
  // Tasks started here, tasks seen running, and tasks already handled, in this visit.
  const started = useRef<ReadonlySet<string>>(new Set());
  const watched = useRef<ReadonlySet<string>>(new Set());
  const settled = useRef<ReadonlySet<string>>(new Set());

  const settle = useCallback((key: SlotKey, task: Task) => {
    if (settled.current.has(task.id) || isClosed(task.id)) return;
    settled.current = new Set([...settled.current, task.id]);
    const seenHere =
      started.current.has(task.id) || watched.current.has(task.id);
    if (task.status === "failed") {
      // Work started here reports its own failure; this is work from before a reload.
      if (watched.current.has(task.id) && !started.current.has(task.id))
        toast.error(task.error ?? GENERIC_FAILURE);
      return;
    }
    const value =
      key === "highlights" ? asHighlights(task.result) : asDraft(task.result);
    if (!hasContent(key, value)) {
      markClosed(task.id);
      if (seenHere)
        toast(NOTHING[key].title, { description: NOTHING[key].description });
      return;
    }
    setShown((current) => ({ ...current, [key]: { taskId: task.id, value } }));
  }, []);

  const runners = {
    story: useRunner("story", () => startDraft(["story"]), started, settle),
    expertise: useRunner(
      "expertise",
      () => startDraft(["expertise"]),
      started,
      settle,
    ),
    case_studies: useRunner(
      "case_studies",
      () => startDraft(["case_studies"]),
      started,
      settle,
    ),
    highlights: useRunner("highlights", startHighlights, started, settle),
  };

  // Work started before you left the page: follow it, and show what it left behind.
  const latestDraft = useLatestTask("website.draft").data ?? null;
  const latestHighlights = useLatestTask("website.highlights").data ?? null;
  useEffect(() => {
    for (const task of [latestDraft, latestHighlights]) {
      if (!task) continue;
      if (isActive(task)) {
        watched.current = new Set([...watched.current, task.id]);
        continue;
      }
      const key = slotOf(task);
      if (key && (isFresh(task) || watched.current.has(task.id)))
        settle(key, task);
    }
  }, [latestDraft, latestHighlights, settle]);

  function slot<K extends SlotKey>(key: K): Slot<SlotValues[K]> {
    const runner = runners[key];
    // Started before a reload or a visit elsewhere; the runner follows its own work.
    const earlier = [latestDraft, latestHighlights].find(
      (task) =>
        task &&
        task.id !== runner.task?.id &&
        isActive(task) &&
        slotOf(task) === key,
    );
    return {
      running: runner.running || Boolean(earlier),
      stage: (runner.running ? runner.task?.stage : earlier?.stage) ?? null,
      value: (shown[key]?.value as SlotValues[K] | undefined) ?? null,
      start: () => runner.run(),
      close: () => {
        const current = shown[key];
        if (current) markClosed(current.taskId);
        setShown((all) => ({ ...all, [key]: undefined }));
      },
      replace: (value) =>
        setShown((all) => {
          const current = all[key];
          return current ? { ...all, [key]: { ...current, value } } : all;
        }),
    };
  }

  return {
    story: slot("story"),
    expertise: slot("expertise"),
    case_studies: slot("case_studies"),
    highlights: slot("highlights"),
  };
}
