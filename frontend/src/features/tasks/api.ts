/**
 * Background tasks: slow work (AI, job sites) runs on the server while people keep using
 * the app. A screen starts a task, follows it here, and gets its result when it's done;
 * leaving the page loses nothing, because results stay on the task.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, unwrap, type Schemas } from "@/lib/api/client";
import { useLiveEvent } from "@/lib/events";

export type Task = Schemas["TaskOut"];
export type TaskList = Schemas["TaskList"];

export const tasksKey = ["tasks"] as const;
const taskKey = (id: string) => ["tasks", "one", id] as const;
const latestKey = (kind: string) => ["tasks", "latest", kind] as const;

/** Live events that mean something in the list may have changed. */
function useRefreshOnChange(client: QueryClient) {
  const refresh = () => void client.invalidateQueries({ queryKey: tasksKey });
  useLiveEvent("task", refresh);
  useLiveEvent("brief.progress", refresh);
  useLiveEvent("brief.ready", refresh);
  useLiveEvent("kit.ready", refresh);
  useLiveEvent("profile.import", refresh);
  useLiveEvent("notification", refresh);
}

export function isActive(
  task: Pick<Task, "status"> | null | undefined,
): boolean {
  return task?.status === "queued" || task?.status === "running";
}

/**
 * Everything working for you now, and what finished in the last hour, kept fresh by live
 * events. Mount it once (the app shell does); other readers use `useTaskList`.
 */
export function useTasks() {
  const client = useQueryClient();
  useRefreshOnChange(client);
  return useTaskList();
}

/** The same list, read without subscribing to live events again. */
export function useTaskList() {
  return useQuery({
    queryKey: tasksKey,
    queryFn: () => unwrap(api.GET("/api/v1/tasks", {})),
    // Events are hints; poll gently while something runs in case one is missed.
    refetchInterval: (query) =>
      (query.state.data as TaskList | undefined)?.running ? 4000 : 30_000,
  });
}

/** One task, followed until it finishes. */
export function useTask(id: string | null) {
  return useQuery({
    queryKey: taskKey(id ?? ""),
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/tasks/{task_id}", {
          params: { path: { task_id: id! } },
        }),
      ),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      isActive(query.state.data as Task | undefined) ? 1500 : false,
  });
}

/** The latest task of a kind: a page shows a result left behind from an earlier visit. */
export function useLatestTask(kind: string) {
  return useQuery({
    queryKey: latestKey(kind),
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/tasks/latest/{kind}", {
          params: { path: { kind } },
        }),
      ),
    refetchInterval: (query) =>
      isActive(query.state.data as Task | null | undefined) ? 2000 : false,
  });
}

interface Options<R> {
  /** Called once when the task finishes well, with its result. */
  onDone?: (result: R, task: Task) => void;
  /** Called once when starting is refused or the task fails, with a plain message. */
  onFailed?: (message: string) => void;
}

/**
 * Start background work and follow it. `run(args)` returns at once; `running` stays true
 * until the task finishes; `result` appears when it's done. The screen stays usable.
 */
export function useBackgroundTask<A = void, R = unknown>(
  start: (args: A) => Promise<Task>,
  options: Options<R> = {},
) {
  const client = useQueryClient();
  const [id, setId] = useState<string | null>(null);
  const latest = useRef(options);
  latest.current = options;

  const mutation = useMutation({
    mutationFn: start,
    onSuccess: (task) => {
      client.setQueryData(taskKey(task.id), task);
      void client.invalidateQueries({ queryKey: tasksKey });
      setId(task.id);
    },
    onError: (error) => latest.current.onFailed?.(error.message),
  });
  const query = useTask(id);
  const task = query.data ?? null;

  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (!task || reported.current === task.id || isActive(task)) return;
    reported.current = task.id;
    if (task.status === "done") latest.current.onDone?.(task.result as R, task);
    else
      latest.current.onFailed?.(
        task.error ?? "Something went wrong. Please try again.",
      );
  }, [task]);

  return {
    run: (args: A) => mutation.mutate(args),
    task,
    running: mutation.isPending || isActive(task),
    result: task?.status === "done" ? (task.result as R) : undefined,
    error: task?.status === "failed" ? task.error : null,
    reset: () => setId(null),
  };
}
