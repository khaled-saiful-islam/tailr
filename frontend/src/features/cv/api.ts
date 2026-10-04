import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@/lib/api/client";
import { useLiveEvent } from "@/lib/events";

export type Cv = Schemas["CvOut"];
export type CvOptions = Schemas["CvOptions"];
export type CvUpdate = Schemas["CvUpdate"];
export type CvAiRequest = Schemas["CvAiRequest"];
export type CvTemplate = Cv["template"];
export type Accent = Cv["accent"];

export const cvKey = ["cv"] as const;

/** Your CV; refreshed when a background AI edit finishes, polled while one runs. */
export function useCv() {
  const client = useQueryClient();
  useLiveEvent("cv.ready", () => {
    void client.invalidateQueries({ queryKey: cvKey });
  });
  return useQuery({
    queryKey: cvKey,
    queryFn: () => unwrap(api.GET("/api/v1/cv", {})),
    refetchInterval: (query) =>
      query.state.data?.status === "working" ? 3000 : false,
    retry: false,
  });
}

function useCvMutation<TBody>(call: (body: TBody) => Promise<Cv>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: (cv) => client.setQueryData(cvKey, cv),
  });
}

export function useSaveCv() {
  return useCvMutation((body: CvUpdate) =>
    unwrap(api.PUT("/api/v1/cv", { body })),
  );
}

export function useCvAi() {
  return useCvMutation((body: CvAiRequest) =>
    unwrap(api.POST("/api/v1/cv/ai", { body })),
  );
}

export function useUndoCv() {
  return useCvMutation((version: number) =>
    unwrap(api.POST("/api/v1/cv/undo", { params: { query: { version } } })),
  );
}

export function useResetCv() {
  return useCvMutation((version: number) =>
    unwrap(api.POST("/api/v1/cv/reset", { params: { query: { version } } })),
  );
}

/** The document as it prints. `stamp` only busts the cache when the CV changed. */
export function documentUrl(
  stamp: string | number,
  overrides: { template?: CvTemplate; accent?: Accent } = {},
): string {
  const params = new URLSearchParams({ v: String(stamp) });
  if (overrides.template) params.set("template", overrides.template);
  if (overrides.accent) params.set("accent", overrides.accent);
  return `/api/v1/cv/document.html?${params.toString()}`;
}

export const TEMPLATES: { key: CvTemplate; name: string; note: string }[] = [
  {
    key: "meridian",
    name: "Meridian",
    note: "Two columns with a tinted side panel. Elegant and calm.",
  },
  {
    key: "ledger",
    name: "Ledger",
    note: "Swiss and exact, one column. Best for online application systems.",
  },
  {
    key: "atelier",
    name: "Atelier",
    note: "A colour band and a bold name. Modern and confident.",
  },
  {
    key: "monogram",
    name: "Monogram",
    note: "Centred and spacious. Quiet authority for senior roles.",
  },
  {
    key: "broadsheet",
    name: "Broadsheet",
    note: "A newspaper front page, with you as the story.",
  },
];

export const ACCENTS: { key: Accent; label: string; hex: string }[] = [
  { key: "ink", label: "Ink", hex: "#1f2a44" },
  { key: "jade", label: "Jade", hex: "#0f6e64" },
  { key: "cobalt", label: "Cobalt", hex: "#1d4ed8" },
  { key: "plum", label: "Plum", hex: "#6b2fa3" },
  { key: "crimson", label: "Crimson", hex: "#b42318" },
  { key: "ochre", label: "Ochre", hex: "#9a6400" },
];
