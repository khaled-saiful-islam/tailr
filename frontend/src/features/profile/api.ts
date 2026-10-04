import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meKey } from "@/features/auth/api";
import { api, unwrap } from "@/lib/api/client";
import { useLiveEvent } from "@/lib/events";
import type { ApiProfileDoc, ImportOut, ProfileOut } from "./types";

export const profileKey = ["profile"] as const;
export const importKey = (id: string) => ["profile-import", id] as const;

const FINAL_STATUSES = new Set(["ready", "applied", "failed"]);

export function useProfile() {
  return useQuery({
    queryKey: profileKey,
    queryFn: () => unwrap(api.GET("/api/v1/profile")),
  });
}

export function useSaveProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { document: ApiProfileDoc; version: number }) =>
      unwrap(api.PUT("/api/v1/profile", { body })),
    onSuccess: (profile) => {
      client.setQueryData(profileKey, profile);
      // The first real save moves onboarding forward.
      void client.invalidateQueries({ queryKey: meKey });
    },
  });
}

export function useUploadCv() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return unwrap(
        api.POST("/api/v1/profile/imports", {
          // openapi-fetch would JSON-encode; send the multipart form as-is.
          body: form as unknown as { file: string },
          bodySerializer: (body) => body as unknown as FormData,
        }),
      );
    },
  });
}

export function usePasteCv() {
  return useMutation({
    mutationFn: (text: string) => unwrap(api.POST("/api/v1/profile/imports/text", { body: { text } })),
  });
}

/** One import; polls while it runs and refreshes instantly on live events. */
export function useImport(id: string) {
  const client = useQueryClient();
  useLiveEvent<{ id: string }>("profile.import", (event) => {
    if (event.data.id === id) void client.invalidateQueries({ queryKey: importKey(id) });
  });
  return useQuery({
    queryKey: importKey(id),
    queryFn: () => unwrap(api.GET("/api/v1/profile/imports/{import_id}", { params: { path: { import_id: id } } })),
    refetchInterval: (query) => {
      const status = (query.state.data as ImportOut | undefined)?.status;
      return status && FINAL_STATUSES.has(status) ? false : 2500;
    },
  });
}

export function useApplyImport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: "replace" | "merge" }) =>
      unwrap(
        api.POST("/api/v1/profile/imports/{import_id}/apply", {
          params: { path: { import_id: id } },
          body: { mode },
        }),
      ),
    onSuccess: (profile: ProfileOut) => {
      client.setQueryData(profileKey, profile);
      void client.invalidateQueries({ queryKey: meKey });
    },
  });
}

export function useCoachBullet() {
  return useMutation({
    mutationFn: (body: { text: string; title?: string | null; company?: string | null }) =>
      unwrap(api.POST("/api/v1/profile/coach/bullet", { body })),
  });
}

export function useWriteSummary() {
  return useMutation({
    mutationFn: () => unwrap(api.POST("/api/v1/profile/coach/summary")),
  });
}
