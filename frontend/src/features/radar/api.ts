import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meKey } from "@/features/auth/api";
import { useResumableTask } from "@/features/tasks/useResumableTask";
import { api, unwrap, type Schemas } from "@/lib/api/client";

export type RadarSettings = Schemas["RadarSettings"];
export type RadarOut = Schemas["RadarOut"];
export type RadarOptions = Schemas["RadarOptionsOut"];
export type Seniority = NonNullable<RadarSettings["seniority"]>[number];
export type EmploymentType = NonNullable<
  RadarSettings["employment_types"]
>[number];
export type WorkMode = Schemas["WorkMode"];

// What background tasks answer. The server keeps these on the task, so they aren't in
// the generated schema; they mirror `radar/schemas.py`.

export interface RoleSuggestion {
  title: string;
  reason: string;
}

export interface Suggestions {
  roles: RoleSuggestion[];
  seniority: Seniority[];
}

export interface PreviewJob {
  source: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  posted_at: string | null;
  posted_text: string | null;
  salary_text: string | null;
  work_mode: WorkMode | null;
}

export interface PreviewSource {
  key: string;
  label: string;
  status: string;
  found: number;
  matching: number;
  error?: string | null;
}

export interface PreviewOut {
  searched_at: string;
  searches: string[];
  found: number;
  on_target: number;
  matching: number;
  dropped: Record<string, number>;
  sources: PreviewSource[];
  samples: PreviewJob[];
}

export const radarKey = ["radar"] as const;

export function useRadar() {
  return useQuery({
    queryKey: radarKey,
    queryFn: () => unwrap(api.GET("/api/v1/radar")),
  });
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
    mutationFn: (body: { settings: RadarSettings; version: number }) =>
      unwrap(api.PUT("/api/v1/radar", { body })),
    onSuccess: (radar) => {
      client.setQueryData(radarKey, radar);
      void client.invalidateQueries({ queryKey: meKey });
    },
  });
}

/** Job titles suggested from the CV, worked out in the background. */
export function useSuggestRoles(onFailed?: (message: string) => void) {
  return useResumableTask<void, Suggestions>(
    "preferences.suggest",
    () => unwrap(api.POST("/api/v1/radar/suggest")),
    { onFailed },
  );
}

/** Start a quick look at the job sites; the editor follows the task. */
export function startPreview(settings: RadarSettings) {
  return unwrap(api.POST("/api/v1/radar/preview", { body: { settings } }));
}

/** Settings with every list present, so the form never handles `undefined`. */
export function completeSettings(
  settings: RadarSettings,
): Required<RadarSettings> {
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
