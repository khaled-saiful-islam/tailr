import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@/lib/api/client";
import { useLiveEvent } from "@/lib/events";
import { tasksKey } from "@/features/tasks/api";

export type Kit = Schemas["KitOut"];
export type TailoredResume = Schemas["TailoredResume"];
export type CoverLetter = Schemas["CoverLetter"];
export type TailoredBullet = Schemas["TailoredBullet"];
export type FactRef = Schemas["FactRef"];
export type SectionRef = Schemas["SectionRef"];
export type KitExtras = Schemas["KitExtras"];
export type Language = Kit["language"];
export type Tone = Kit["tone"];

export const kitKey = (id: string) => ["kit", id] as const;
export const kitForMatchKey = (matchId: string) =>
  ["kit-for-match", matchId] as const;

/** One kit; follows the build live and polls while it runs. */
export function useKit(id: string) {
  const client = useQueryClient();
  const refresh = (event: { data: { id?: string } }) => {
    if (event.data.id === id)
      void client.invalidateQueries({ queryKey: kitKey(id) });
  };
  useLiveEvent<{ id?: string }>("kit.progress", refresh);
  useLiveEvent<{ id?: string }>("kit.ready", refresh);
  return useQuery({
    queryKey: kitKey(id),
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/kits/{kit_id}", { params: { path: { kit_id: id } } }),
      ),
    refetchInterval: (query) =>
      query.state.data?.status === "building" ? 3000 : false,
  });
}

/** The kit for a job, or null if none has been made yet. */
export function useKitForMatch(matchId: string) {
  const client = useQueryClient();
  useLiveEvent<{ id?: string }>("kit.ready", () => {
    void client.invalidateQueries({ queryKey: kitForMatchKey(matchId) });
  });
  return useQuery({
    queryKey: kitForMatchKey(matchId),
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/kits/by-match/{match_id}", {
          params: { path: { match_id: matchId } },
        }),
      ),
  });
}

export function useCreateKit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { match_id: string; language: Language; tone: Tone }) =>
      unwrap(api.POST("/api/v1/kits", { body })),
    onSuccess: (kit) => {
      client.setQueryData(kitKey(kit.id), kit);
      if (kit.match_id) client.setQueryData(kitForMatchKey(kit.match_id), kit);
    },
  });
}

export function useRegenerateKit(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { language?: Language; tone?: Tone }) =>
      unwrap(
        api.POST("/api/v1/kits/{kit_id}/regenerate", {
          params: { path: { kit_id: id } },
          body,
        }),
      ),
    onSuccess: (kit) => client.setQueryData(kitKey(id), kit),
  });
}

export function useSaveKit(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      version: number;
      resume?: TailoredResume;
      cover_letter?: CoverLetter;
    }) =>
      unwrap(
        api.PUT("/api/v1/kits/{kit_id}", {
          params: { path: { kit_id: id } },
          body,
        }),
      ),
    onSuccess: (kit) => client.setQueryData(kitKey(id), kit),
  });
}

/**
 * Add a job from a link or pasted ad. Quick checks answer at once; reading the job and
 * matching it runs in the background, and a notification links to the job when it's in.
 */
export function usePasteJob() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      url?: string;
      title?: string;
      company?: string;
      text?: string;
    }) => unwrap(api.POST("/api/v1/jobs/paste", { body })),
    onSuccess: () => void client.invalidateQueries({ queryKey: tasksKey }),
  });
}

export function documentUrl(
  kitId: string,
  which: "resume" | "letter",
  format: "html" | "pdf",
  version = 0,
): string {
  return `/api/v1/kits/${kitId}/${which}.${format}${format === "html" ? `?v=${version}` : ""}`;
}
