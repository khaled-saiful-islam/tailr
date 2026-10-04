import { ExternalLink } from "lucide-react";
import { Tabs } from "radix-ui";
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
  useInbox,
  usePagePreview,
  usePageSettings,
  useSavePage,
  type PortfolioDraft,
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
import { InboxPanel } from "./components/InboxPanel";
import { LookPanel } from "./components/LookPanel";
import { PublishPanel } from "./components/PublishPanel";
import {
  AwardsPanel,
  SitePanel,
  TestimonialsPanel,
} from "./components/RecognitionPanels";
import { ExpertisePanel, StoryPanel } from "./components/StoryPanels";
import { ViewsPanel } from "./components/ViewsPanel";
import {
  applyDraft,
  draftFrom,
  forSaving,
  portfolioOf,
  portfolioUpdater,
  type PageDraft,
} from "./draft";

const TABS = [
  { value: "publish", label: "Publish" },
  { value: "design", label: "Design" },
  { value: "about", label: "About" },
  { value: "highlights", label: "Highlights" },
  { value: "projects", label: "Projects" },
  { value: "inbox", label: "Messages" },
] as const;

const STATUS_LABEL: Record<PageDraft["visibility"], string> = {
  off: "Not published",
  link: "Online, link only",
  public: "Online, public",
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
  const [tab, setTab] = useState<string>("publish");
  const [suggestion, setSuggestion] = useState<PortfolioDraft | null>(null);
  const inbox = useInbox();

  const editor = useVersionedAutosave<PageSettingsOut, PageDraft>({
    data: settings.data,
    read: (saved) => ({ value: draftFrom(saved), version: saved.version }),
    save: ({ value, version }, callbacks) =>
      save.mutate(
        { version, ...forSaving(value) },
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
        <h1 className="type-title">Your website starts with your profile</h1>
        <p className="mt-3 text-ink-2">
          Fill in your profile first. Your website is made from it, so it's
          never out of date.
        </p>
        <Button asChild className="mt-6">
          <Link to="/profile">Fill in my profile</Link>
        </Button>
      </div>
    );
  }
  if (!draft || !page) return null;

  const saved = settings.data;
  const onImage = (image: ImageOut) => images.current.set(image.id, image);
  const update = editor.update;
  const projectImages = Object.keys(draft.settings.project_images ?? {}).length;
  const portfolio = portfolioOf(draft);
  const updatePortfolio = portfolioUpdater(update);
  const unread = inbox.data?.unread ?? 0;

  return (
    <div className="mx-auto w-full max-w-[110rem] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <ProfileTabs />
      <header className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <h1 className="type-title">My website</h1>
          <p className="mt-2 max-w-[42rem] text-ink-2">
            A personal website made from your profile: your story, your projects
            and a way to reach you. Changes save as you type.
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
                Open my website
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

      <div className="mt-6 grid grid-cols-1 gap-8 lg:mt-8 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] xl:gap-10">
        <div className={cn(view === "preview" && "hidden lg:block")}>
          <Tabs.Root value={tab} onValueChange={setTab}>
            <Tabs.List
              aria-label="Website tools"
              className="mb-5 flex flex-wrap border-b border-line"
            >
              {TABS.map((item) => (
                <Tabs.Trigger
                  key={item.value}
                  value={item.value}
                  className="relative -mb-px inline-flex h-11 items-center gap-1.5 border-b-[3px] border-transparent px-2.5 text-[0.9375rem] font-medium text-ink-2 transition-colors hover:text-ink data-[state=active]:border-tape data-[state=active]:text-ink"
                >
                  {item.label}
                  {item.value === "inbox" && unread > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-pin px-1 text-[0.6875rem] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <Tabs.Content
              value="publish"
              className="flex flex-col gap-6 focus-visible:outline-none"
            >
              <PublishPanel draft={draft} saved={saved} update={update} />
              <ViewsPanel stats={saved.stats} />
            </Tabs.Content>
            <Tabs.Content
              value="design"
              className="flex flex-col gap-6 focus-visible:outline-none"
            >
              <LookPanel
                draft={draft}
                update={update}
                projectImages={projectImages}
              />
              <SitePanel portfolio={portfolio} update={updatePortfolio} />
              <SectionsPanel draft={draft} update={update} />
            </Tabs.Content>
            <Tabs.Content
              value="about"
              className="flex flex-col gap-6 focus-visible:outline-none"
            >
              <AboutPanel
                draft={draft}
                name={page.name}
                update={update}
                onImage={onImage}
              />
              <StoryPanel
                portfolio={portfolio}
                update={updatePortfolio}
                suggestion={suggestion}
                onSuggestion={setSuggestion}
              />
              <ExpertisePanel
                portfolio={portfolio}
                update={updatePortfolio}
                suggestion={suggestion}
                onSuggestion={setSuggestion}
              />
            </Tabs.Content>
            <Tabs.Content
              value="highlights"
              className="flex flex-col gap-6 focus-visible:outline-none"
            >
              <HighlightsPanel draft={draft} update={update} />
              <AwardsPanel portfolio={portfolio} update={updatePortfolio} />
              <TestimonialsPanel
                portfolio={portfolio}
                update={updatePortfolio}
              />
            </Tabs.Content>
            <Tabs.Content
              value="projects"
              className="flex flex-col gap-6 focus-visible:outline-none"
            >
              <ProjectsPanel
                draft={draft}
                update={update}
                projects={preview.data?.projects ?? []}
                onImage={onImage}
                suggestion={suggestion}
                onSuggestion={setSuggestion}
              />
            </Tabs.Content>
            <Tabs.Content value="inbox" className="focus-visible:outline-none">
              <InboxPanel />
            </Tabs.Content>
          </Tabs.Root>
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
