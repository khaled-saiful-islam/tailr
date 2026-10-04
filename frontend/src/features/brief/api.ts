import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@/lib/api/client";
import { useLiveEvent } from "@/lib/events";

export type Today = Schemas["TodayOut"];
export type Brief = Schemas["BriefOut"];
export type Match = Schemas["MatchOut"];
export type MatchDetail = Schemas["MatchDetailOut"];
export type MatchPage = Schemas["MatchPage"];
export type MatchStatus = Match["status"];

export const todayKey = ["brief", "today"] as const;
export const matchesKey = (status: string) => ["matches", status] as const;
export const matchKey = (id: string) => ["match", id] as const;

/** The latest job search and its status. Refreshes live while one is running. */
export function useToday() {
  const client = useQueryClient();
  const refresh = () => void client.invalidateQueries({ queryKey: todayKey });
  useLiveEvent("brief.progress", refresh);
  useLiveEvent("brief.ready", () => {
    refresh();
    void client.invalidateQueries({ queryKey: ["matches"] });
    void client.invalidateQueries({ queryKey: ["momentum"] });
  });
  return useQuery({
    queryKey: todayKey,
    queryFn: () => unwrap(api.GET("/api/v1/briefs/today")),
    refetchInterval: (query) =>
      query.state.data?.brief?.status === "building" ? 4000 : false,
  });
}

export function useRunBrief() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/api/v1/briefs/run")),
    onSuccess: (brief) =>
      client.setQueryData<Today>(todayKey, (today) =>
        today ? { ...today, brief } : today,
      ),
  });
}

export function useMatches(status: MatchStatus | "all") {
  return useQuery({
    queryKey: matchesKey(status),
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/matches", {
          params: {
            query: {
              status: status === "all" ? undefined : status,
              limit: 100,
            },
          },
        }),
      ),
  });
}

const PAGE = 100;

/** Every job for one filter, newest first, a hundred at a time. */
export function useJobList(status: MatchStatus | "all") {
  return useInfiniteQuery({
    queryKey: ["matches", "list", status],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      unwrap(
        api.GET("/api/v1/matches", {
          params: {
            query: {
              status: status === "all" ? undefined : status,
              limit: PAGE,
              offset: pageParam,
            },
          },
        }),
      ),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
  });
}

export function useMatch(id: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: matchKey(id),
    queryFn: async () => {
      const detail = await unwrap(
        api.GET("/api/v1/matches/{match_id}", {
          params: { path: { match_id: id } },
        }),
      );
      // Opening a job marks it seen; keep lists in step.
      patchMatchEverywhere(client, detail.id, { status: detail.status });
      return detail;
    },
  });
}

/** Apply a change to a match wherever it is cached (brief, lists, detail). */
function patchMatchEverywhere(
  client: QueryClient,
  id: string,
  patch: Partial<Match>,
): void {
  client.setQueryData<Today>(todayKey, (today) =>
    today?.brief
      ? {
          ...today,
          brief: {
            ...today.brief,
            matches: today.brief.matches
              .map((m) => (m.id === id ? { ...m, ...patch } : m))
              .filter((m) => m.status !== "dismissed"),
          },
        }
      : today,
  );
  const patchPage = (page: MatchPage): MatchPage => ({
    ...page,
    items: page.items.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  });
  client.setQueriesData<MatchPage | InfiniteData<MatchPage>>(
    { queryKey: ["matches"] },
    (data) => {
      if (!data) return data;
      if ("pages" in data) return { ...data, pages: data.pages.map(patchPage) };
      return patchPage(data);
    },
  );
  client.setQueryData<MatchDetail>(matchKey(id), (detail) =>
    detail ? { ...detail, ...patch } : detail,
  );
}

export function useUpdateMatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "saved" | "dismissed" | "seen" | "new";
    }) =>
      unwrap(
        api.PATCH("/api/v1/matches/{match_id}", {
          params: { path: { match_id: id } },
          body: { status },
        }),
      ),
    onMutate: ({ id, status }) => patchMatchEverywhere(client, id, { status }),
    onSettled: (_data, _error, { id }) => {
      void client.invalidateQueries({ queryKey: ["matches"] });
      // Saving puts a job on the tracker; skipping an untouched one takes it off.
      void client.invalidateQueries({ queryKey: matchKey(id) });
      void client.invalidateQueries({ queryKey: ["applications"] });
      void client.invalidateQueries({ queryKey: ["momentum"] });
    },
  });
}
