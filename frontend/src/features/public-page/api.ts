import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, unwrap, type Schemas } from "@/lib/api/client";

export type PageSettingsOut = Schemas["PublicProfileOut"];
export type PageSettings = Schemas["PageSettings"];
export type PageUpdate = Schemas["PublicProfileUpdate"];
export type Highlight = Schemas["Highlight"];
export type ImageOut = Schemas["ImageOut"];
export type PublicPageData = Schemas["PublicPage"];

export const pageSettingsKey = ["public-page", "settings"] as const;
export const pagePreviewKey = ["public-page", "preview"] as const;

export function usePageSettings() {
  return useQuery({
    queryKey: pageSettingsKey,
    queryFn: () => unwrap(api.GET("/api/v1/public-profile", {})),
  });
}

export function useSavePage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: PageUpdate) =>
      unwrap(api.PUT("/api/v1/public-profile", { body })),
    onSuccess: (saved) => {
      client.setQueryData(pageSettingsKey, saved);
      void client.invalidateQueries({ queryKey: pagePreviewKey });
    },
  });
}

/** The page as visitors would see it, from the last saved settings. */
export function usePagePreview() {
  return useQuery({
    queryKey: pagePreviewKey,
    queryFn: () => unwrap(api.GET("/api/v1/public-profile/preview", {})),
    retry: false,
  });
}

export function checkSlug(slug: string) {
  return unwrap(
    api.GET("/api/v1/public-profile/slug-check", {
      params: { query: { slug } },
    }),
  );
}

export function useSuggestHighlights() {
  return useMutation({
    mutationFn: () =>
      unwrap(api.POST("/api/v1/public-profile/highlights/suggest", {})),
  });
}

/** Multipart upload: the typed client doesn't do files, so this is plain fetch. */
export function useUploadImage() {
  return useMutation({
    mutationFn: async ({
      file,
      purpose,
    }: {
      file: File;
      purpose: "avatar" | "project";
    }): Promise<ImageOut> => {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", purpose);
      let response: Response;
      try {
        response = await fetch("/api/v1/images", {
          method: "POST",
          body: form,
          credentials: "include",
        });
      } catch {
        throw new ApiError(
          0,
          "network_error",
          "Can't reach Tailr. Check your connection.",
        );
      }
      const body = (await response.json().catch(() => ({}))) as {
        error?: { code?: string; message?: string };
      } & Partial<ImageOut>;
      if (!response.ok) {
        throw new ApiError(
          response.status,
          body.error?.code ?? "http_error",
          body.error?.message ?? "That picture couldn't be uploaded.",
        );
      }
      return body as ImageOut;
    },
  });
}

export function imageUrl(id: string | null | undefined): string | null {
  return id ? `/api/v1/images/${id}.webp` : null;
}

export type PortfolioContent = Schemas["PortfolioContent"];
export type PortfolioDraft = Schemas["PortfolioDraft"];
export type CaseStudy = Schemas["CaseStudy"];
export type Inbox = Schemas["Inbox"];
export type DraftPart = Schemas["DraftRequest"]["parts"][number];

/** AI suggestions for the portfolio's words; nothing is saved until applied. */
export function useDraftPortfolio() {
  return useMutation({
    mutationFn: (parts: DraftPart[]) =>
      unwrap(api.POST("/api/v1/public-profile/draft", { body: { parts } })),
  });
}

export const inboxKey = ["public-page", "inbox"] as const;

export function useInbox() {
  return useQuery({
    queryKey: inboxKey,
    queryFn: () => unwrap(api.GET("/api/v1/public-profile/messages", {})),
  });
}

export function useMarkMessageRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.POST("/api/v1/public-profile/messages/{message_id}/read", {
          params: { path: { message_id: id } },
        }),
      ),
    onSettled: () => client.invalidateQueries({ queryKey: inboxKey }),
  });
}

export function useDeleteMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.DELETE("/api/v1/public-profile/messages/{message_id}", {
          params: { path: { message_id: id } },
        }),
      ),
    onSettled: () => client.invalidateQueries({ queryKey: inboxKey }),
  });
}

export const EMPTY_PORTFOLIO: PortfolioContent = {
  hero_line: null,
  about: [],
  currently: null,
  interests: [],
  expertise: [],
  awards: [],
  testimonials: [],
  case_studies: {},
  layout: "one_page",
  contact_form: true,
  whatsapp: null,
};
