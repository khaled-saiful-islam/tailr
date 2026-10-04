import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meKey } from "@/features/auth/api";
import { api, unwrap, type Schemas } from "@/lib/api/client";

export type RadarSettings = Schemas["RadarSettings"];
export type RadarOut = Schemas["RadarOut"];
export type PreviewOut = Schemas["PreviewOut"];
export type Suggestions = Schemas["SuggestionsOut"];
export type RadarOptions = Schemas["RadarOptionsOut"];
export type Seniority = NonNullable<RadarSettings["seniority"]>[number];
export type EmploymentType = NonNullable<RadarSettings["employment_types"]>[number];
export type WorkMode = Schemas["WorkMode"];

export const radarKey = ["radar"] as const;

export function useRadar() {
  return useQuery({ queryKey: radarKey, queryFn: () => unwrap(api.GET("/api/v1/radar")) });
}

export function useRadarOptions() {
  return useQuery({
    queryKey: ["radar-options"],
    queryFn: () => unwrap(api.GET("/api/v1/radar/options")),
    staleTime: Infinity,
  });
}

export function useSaveRadar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { settings: RadarSettings; version: number }) => unwrap(api.PUT("/api/v1/radar", { body })),
    onSuccess: (radar) => {
      client.setQueryData(radarKey, radar);
      void client.invalidateQueries({ queryKey: meKey });
    },
  });
}

export function useSuggestRoles() {
  return useMutation({ mutationFn: () => unwrap(api.POST("/api/v1/radar/suggest")) });
}

export function usePreviewRadar() {
  return useMutation({
    mutationFn: (settings: RadarSettings) => unwrap(api.POST("/api/v1/radar/preview", { body: { settings } })),
  });
}

/** Settings with every list present, so the form never handles `undefined`. */
export function completeSettings(settings: RadarSettings): Required<RadarSettings> {
  return {
    roles: settings.roles ?? [],
    anywhere: settings.anywhere,
    places: settings.places ?? [],
    work_modes: settings.work_modes ?? ["onsite", "hybrid", "remote"],
    employment_types: settings.employment_types ?? ["full_time", "contract"],
    seniority: settings.seniority ?? [],
    salary_min: settings.salary_min ?? null,
    include_no_salary: settings.include_no_salary,
    must_have: settings.must_have ?? [],
    exclude_keywords: settings.exclude_keywords ?? [],
    exclude_companies: settings.exclude_companies ?? [],
    freshness_days: settings.freshness_days,
    min_fit: settings.min_fit,
    sources: settings.sources ?? ["linkedin", "jobstreet"],
    brief_time: settings.brief_time,
    brief_days: settings.brief_days ?? [0, 1, 2, 3, 4, 5, 6],
    email_brief: settings.email_brief,
    paused: settings.paused,
  };
}

export type CompleteSettings = Required<RadarSettings>;
