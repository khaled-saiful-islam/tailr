import { useEffect, useMemo, useState } from "react";
import { ownerOf, rememberOwner } from "@/features/tasks/useResumableTask";
import {
  isActive,
  useBackgroundTask,
  useLatestTask,
  type Task,
} from "@/features/tasks/api";
import { startPreview, type CompleteSettings, type PreviewOut } from "../api";

/** Settings that change what the search finds (the update time doesn't). */
function previewKey(s: CompleteSettings): string {
  return JSON.stringify([
    s.roles,
    s.anywhere,
    s.places,
    s.work_modes,
    s.employment_types,
    s.seniority,
    s.salary_min,
    s.include_no_salary,
    s.must_have,
    s.exclude_keywords,
    s.exclude_companies,
    s.freshness_days,
    s.sources,
  ]);
}

interface Look {
  settings: CompleteSettings;
  key: string;
}

const finishedAt = (task: Task) =>
  Date.parse(task.finished_at ?? task.created_at);

/**
 * The quick look at LinkedIn and JobStreet. It searches only when you ask: the page shows
 * the last check and when it ran (from any visit or device), and says when your
 * preferences changed since. A check started earlier is followed until it finishes, and
 * the last answer stays on screen while a new one runs.
 */
export function usePreview(settings: CompleteSettings | null | undefined) {
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<Task | null>(null);
  const latest = useLatestTask("preferences.preview");
  const job = useBackgroundTask<Look, PreviewOut>(
    async ({ settings: wanted, key }) => {
      const task = await startPreview(wanted);
      rememberOwner(task.id, key);
      return task;
    },
    { onDone: () => setError(null), onFailed: setError },
  );

  const left = latest.data ?? null;
  const done = [job.task, left].find((task) => task?.status === "done") ?? null;
  useEffect(() => {
    if (done && (!shown || finishedAt(done) > finishedAt(shown)))
      setShown(done);
  }, [done, shown]);

  const key = useMemo(() => (settings ? previewKey(settings) : ""), [settings]);
  const checkedFor = shown ? ownerOf(shown.id) : undefined;

  const scan = () => {
    if (!settings || settings.roles.length === 0) return;
    setError(null);
    job.run({ settings, key: previewKey(settings) });
  };

  return {
    preview: shown?.result as PreviewOut | undefined,
    previewError: error,
    scanning: job.running || isActive(left),
    /** The preferences changed since the check on screen (when that's known). */
    previewOutdated: Boolean(checkedFor && key && checkedFor !== key),
    scan,
  };
}
