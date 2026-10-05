import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  isActive,
  useBackgroundTask,
  useLatestTask,
} from "@/features/tasks/api";
import { api, unwrap, type Schemas } from "@/lib/api/client";
import { useLiveEvent } from "@/lib/events";
import type { Stage } from "./stages";

export type Application = Schemas["ApplicationOut"];
export type ApplicationDetail = Schemas["ApplicationDetail"];
export type Board = Schemas["Board"];
export type ApplicationUpdate = Schemas["ApplicationUpdate"];

export const boardKey = ["applications"] as const;
const detailKey = (id: string) => ["applications", id] as const;

/** Other screens that show where a job stands. */
function refreshElsewhere(client: QueryClient) {
  void client.invalidateQueries({ queryKey: ["momentum"] });
  void client.invalidateQueries({ queryKey: ["match"] });
  void client.invalidateQueries({ queryKey: ["kit"] });
}

export function useBoard() {
  return useQuery({
    queryKey: boardKey,
    queryFn: () => unwrap(api.GET("/api/v1/applications", {})),
    // Saving a job or building a kit elsewhere changes the board.
    refetchOnMount: "always",
  });
}

/** One application; follows its CV and cover letter while they're being written. */
export function useApplication(id: string | null) {
  const client = useQueryClient();
  useLiveEvent("kit.ready", () => {
    void client.invalidateQueries({ queryKey: boardKey });
  });
  return useQuery({
    queryKey: detailKey(id ?? ""),
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/applications/{application_id}", {
          params: { path: { application_id: id! } },
        }),
      ),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.kit_status === "building" ? 4000 : false,
  });
}

function patchBoard(
  client: QueryClient,
  id: string,
  patch: Partial<Application>,
): void {
  client.setQueryData<Board>(boardKey, (board) => {
    if (!board) return board;
    const items = board.items.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    );
    const counts = Object.fromEntries(
      Object.keys(board.counts).map((stage) => [
        stage,
        items.filter((item) => item.stage === stage).length,
      ]),
    );
    return { items, counts };
  });
  client.setQueryData<ApplicationDetail>(detailKey(id), (detail) =>
    detail ? { ...detail, ...patch } : detail,
  );
}

/** Move or edit an application. The board updates at once; the server confirms. */
export function useUpdateApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: ApplicationUpdate & { id: string }) =>
      unwrap(
        api.PATCH("/api/v1/applications/{application_id}", {
          params: { path: { application_id: id } },
          body,
        }),
      ),
    onMutate: async ({ id, ...body }) => {
      await client.cancelQueries({ queryKey: boardKey });
      const before = client.getQueryData<Board>(boardKey);
      patchBoard(client, id, body as Partial<Application>);
      return { before };
    },
    onError: (_error, _vars, context) => {
      if (context?.before) client.setQueryData(boardKey, context.before);
    },
    onSuccess: (saved) => patchBoard(client, saved.id, saved),
    onSettled: (_data, _error, { id }) => {
      void client.invalidateQueries({ queryKey: detailKey(id) });
      refreshElsewhere(client);
    },
  });
}

/** Put a job from your matches on the board, optionally straight into a stage. */
export function useTrack() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      match_id,
      stage = "saved",
    }: {
      match_id: string;
      stage?: Stage;
    }) =>
      unwrap(api.POST("/api/v1/applications", { body: { match_id, stage } })),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: boardKey });
      refreshElsewhere(client);
    },
  });
}

export function useRemoveApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.DELETE("/api/v1/applications/{application_id}", {
          params: { path: { application_id: id } },
        }),
      ),
    onMutate: (id) =>
      client.setQueryData<Board>(boardKey, (board) =>
        board
          ? { ...board, items: board.items.filter((item) => item.id !== id) }
          : board,
      ),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: boardKey });
      void client.invalidateQueries({ queryKey: ["matches"] });
      refreshElsewhere(client);
    },
  });
}

/** Where a follow-up shows when it's done; the task carries it from the start. */
const followUpLinks = (appId: string) => [
  `/applications/${appId}`,
  `/applications?open=${appId}`, // tasks started before application pages
];

/**
 * Write a follow-up in the background. The application keeps the draft, so leaving the
 * page loses nothing; coming back while the note is being written shows that it's coming.
 */
export function useDraftFollowUp(
  appId: string,
  onFailed: (message: string) => void,
) {
  const client = useQueryClient();
  const runner = useBackgroundTask<void, Application>(
    async () => {
      return unwrap(
        api.POST("/api/v1/applications/{application_id}/follow-up/draft", {
          params: { path: { application_id: appId } },
        }),
      );
    },
    {
      onDone: (saved) => {
        patchBoard(client, saved.id, saved);
        void client.invalidateQueries({ queryKey: detailKey(saved.id) });
      },
      onFailed,
    },
  );

  // Started earlier (before leaving the page, or on another device): follow it.
  const latest = useLatestTask("applications.follow_up").data ?? null;
  const earlier =
    latest &&
    latest.id !== runner.task?.id &&
    followUpLinks(appId).includes(latest.link ?? "")
      ? latest
      : null;
  const earlierRunning = isActive(earlier);
  const wasRunning = useRef(false);
  const failed =
    earlier?.status === "failed"
      ? (earlier.error ?? "Something went wrong. Please try again.")
      : null;
  const report = useRef(onFailed);
  report.current = onFailed;
  useEffect(() => {
    if (wasRunning.current && !earlierRunning) {
      void client.invalidateQueries({ queryKey: detailKey(appId) });
      void client.invalidateQueries({ queryKey: boardKey });
      if (failed) report.current(failed);
    }
    wasRunning.current = earlierRunning;
  }, [earlierRunning, failed, appId, client]);

  return {
    run: () => runner.run(),
    running: runner.running || earlierRunning,
  };
}

export function useFollowedUp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.POST("/api/v1/applications/{application_id}/follow-up/done", {
          params: { path: { application_id: id } },
        }),
      ),
    onSuccess: (saved) => patchBoard(client, saved.id, saved),
    onSettled: (_data, _error, id) =>
      void client.invalidateQueries({ queryKey: detailKey(id) }),
  });
}

/** Today, in the user's own time: is a follow-up due for this application? */
export function followUpDue(app: Application, now = new Date()): boolean {
  return (
    app.stage === "applied" &&
    !app.followed_up_at &&
    Boolean(app.follow_up_due_at) &&
    new Date(app.follow_up_due_at!) <= now
  );
}
