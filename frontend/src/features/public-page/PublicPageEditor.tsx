import { ExternalLink } from "lucide-react";
import { ProfileTabs } from "@/features/profile/components/ProfileTabs";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/choice";
import { Spinner } from "@/components/ui/Spinner";
import { SaveIndicator } from "@/features/profile/components/SaveIndicator";
import { isApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { useVersionedAutosave } from "@/lib/useVersionedAutosave";
import {
  usePagePreview,
  usePageSettings,
  useSavePage,
  type ImageOut,
  type PageSettingsOut,
} from "./api";
import { AboutPanel } from "./components/AboutPanel";
import {
  HighlightsPanel,
  ProjectsPanel,
  SectionsPanel,
} from "./components/ContentPanels";
import { LivePreview } from "./components/LivePreview";
import { LookPanel } from "./components/LookPanel";
import { PublishPanel } from "./components/PublishPanel";
import { ViewsPanel } from "./components/ViewsPanel";
import { applyDraft, draftFrom, type PageDraft } from "./draft";

const STATUS_LABEL: Record<PageDraft["visibility"], string> = {
  off: "Off",
  link: "Live, link only",
  public: "Live, public",
};

/** Errors that mean one choice can't be saved: undo that choice, keep the rest. */
function revert(
  code: string,
  saved: PageSettingsOut,
  draft: PageDraft,
): PageDraft {
  switch (code) {
    case "slug_taken":
    case "slug_invalid":
      return { ...draft, slug: saved.slug };
    case "profile_incomplete":
      return { ...draft, visibility: saved.visibility };
    case "image_not_found":
      return {
        ...draft,
        settings: {
          ...draft.settings,
          photo_id: saved.settings.photo_id,
          project_images: saved.settings.project_images,
        },
      };
    case "highlight_not_in_profile":
      return {
        ...draft,
        settings: { ...draft.settings, highlights: saved.settings.highlights },
      };
    default:
      return draft;
  }
}

/** /page: build and publish your public profile page, with a live preview. */
export function PublicPageEditor() {
  const settings = usePageSettings();
  const preview = usePagePreview();
  const save = useSavePage();
  const images = useRef(new Map<string, ImageOut>());
  const [view, setView] = useState<"edit" | "preview">("edit");

  const editor = useVersionedAutosave<PageSettingsOut, PageDraft>({
    data: settings.data,
    read: (saved) => ({ value: draftFrom(saved), version: saved.version }),
    save: ({ value, version }, callbacks) =>
      save.mutate(
        { version, ...value },
        {
          onSuccess: (saved) => callbacks.onSuccess(saved.version),
          onError: (error) => {
            callbacks.onError(error);
            if (
              isApiError(error) &&
              settings.data &&
              error.code !== "version_conflict"
            ) {
              toast.error(error.message);
              const saved = settings.data;
              editor.update((draft) => revert(error.code, saved, draft));
            }
          },
        },
      ),
    refetch: async () => (await settings.refetch()).data,
  });

  const draft = editor.value;
  const page = useMemo(
    () =>
      preview.data && draft
        ? applyDraft(preview.data, draft, images.current)
        : null,
    [preview.data, draft],
  );

  if (settings.isPending || (preview.isPending && !preview.isError)) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner className="size-7 text-ink-3" />
      </div>
    );
  }
  if (settings.isError) {
    return (
      <p className="px-5 py-16 text-center text-ink-2">
        {settings.error.message}
      </p>
    );
  }
  if (preview.isError) {
    return (
      <div className="mx-auto max-w-[36rem] px-5 py-16 text-center">
        <h1 className="type-title">Your page starts with your profile</h1>
        <p className="mt-3 text-ink-2">
          Build your profile first. Your page is made from it, so it's never out
          of date.
        </p>
        <Button asChild className="mt-6">
          <Link to="/profile">Build my profile</Link>
        </Button>
      </div>
    );
  }
  if (!draft || !page) return null;

  const saved = settings.data;
  const onImage = (image: ImageOut) => images.current.set(image.id, image);
  const update = editor.update;
  const projectImages = Object.keys(draft.settings.project_images ?? {}).length;

  return (
    <div className="mx-auto w-full max-w-[110rem] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <ProfileTabs />
      <header className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <h1 className="type-title">Your portfolio</h1>
          <p className="mt-2 max-w-[42rem] text-ink-2">
            A public profile page to share on LinkedIn, WhatsApp or your CV,
            made from your profile. Changes save as you type.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SaveIndicator
            status={editor.status}
            onRetry={editor.retry}
            onReload={() => void editor.reload()}
          />
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.875rem] font-semibold",
              saved.visibility === "off"
                ? "bg-surface-2 text-ink-2"
                : "bg-[color-mix(in_oklab,var(--fit-strong)_14%,transparent)] text-ink",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                saved.visibility === "off" ? "bg-ink-3" : "bg-fit-strong",
              )}
              aria-hidden
            />
            {STATUS_LABEL[saved.visibility]}
          </span>
          {saved.visibility !== "off" && (
            <Button variant="secondary" asChild>
              <a href={saved.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden />
                Open page
              </a>
            </Button>
          )}
        </div>
      </header>

      <div className="mt-6 lg:hidden">
        <Segmented
          label="Show"
          options={[
            { value: "edit", label: "Edit" },
            { value: "preview", label: "Preview" },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] xl:gap-10">
        <div
          className={cn(
            "flex flex-col gap-6",
            view === "preview" && "hidden lg:flex",
          )}
        >
          <PublishPanel draft={draft} saved={saved} update={update} />
          <LookPanel
            draft={draft}
            update={update}
            projectImages={projectImages}
          />
          <AboutPanel
            draft={draft}
            name={page.name}
            update={update}
            onImage={onImage}
          />
          <HighlightsPanel draft={draft} update={update} />
          <ProjectsPanel
            draft={draft}
            update={update}
            projects={preview.data?.projects ?? []}
            onImage={onImage}
          />
          <SectionsPanel draft={draft} update={update} />
          <ViewsPanel stats={saved.stats} />
        </div>
        <div
          className={cn(
            "lg:sticky lg:top-6 lg:self-start",
            view === "edit" && "hidden lg:block",
          )}
        >
          <LivePreview page={page} />
        </div>
      </div>
    </div>
  );
}
