import { Download, RefreshCw } from "lucide-react";
import { Tabs } from "radix-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/choice";
import { Spinner } from "@/components/ui/Spinner";
import { ResumeEditor } from "@/features/kits/components/ResumeEditor";
import { ProfileTabs } from "@/features/profile/components/ProfileTabs";
import { SaveIndicator } from "@/features/profile/components/SaveIndicator";
import { cn } from "@/lib/cn";
import { useVersionedAutosave } from "@/lib/useVersionedAutosave";
import { documentUrl, useCv, useResetCv, useSaveCv, type Cv } from "./api";
import { AiPanel } from "./components/AiPanel";
import { DesignPanel } from "./components/DesignPanel";
import { LiveDocument } from "./components/LiveDocument";
import { SharePanel } from "./components/SharePanel";

type Draft = Pick<
  Cv,
  "template" | "accent" | "options" | "content" | "visibility"
>;

function draftFrom(cv: Cv): Draft {
  return {
    template: cv.template,
    accent: cv.accent,
    options: cv.options,
    content: cv.content,
    visibility: cv.visibility,
  };
}

/** A short fingerprint, so thumbnails redraw only when the words or photo change. */
function fingerprint(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1)
    hash = (hash * 33) ^ text.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

const TABS = [
  { value: "design", label: "Design" },
  { value: "words", label: "Words" },
  { value: "ai", label: "AI edits" },
  { value: "share", label: "Share" },
] as const;

/** /profile/cv: design, edit (by hand or with AI), download and share your CV. */
export function CvStudio() {
  const cv = useCv();
  const save = useSaveCv();
  const reset = useResetCv();
  const [tab, setTab] = useState<string>("design");
  const [view, setView] = useState<"edit" | "preview">("edit");

  const editor = useVersionedAutosave<Cv, Draft>({
    data: cv.data,
    read: (saved) => ({ value: draftFrom(saved), version: saved.version }),
    save: ({ value, version }, callbacks) =>
      save.mutate(
        { version, ...value },
        {
          onSuccess: (saved) => callbacks.onSuccess(saved.version),
          onError: (error) => {
            callbacks.onError(error);
            toast.error(error.message);
          },
        },
      ),
    refetch: async () => (await cv.refetch()).data,
  });

  // A background AI edit finished: load the new words.
  const status = cv.data?.status;
  const lastStatus = useRef(status);
  useEffect(() => {
    if (lastStatus.current === "working" && status !== "working")
      void editor.reload();
    lastStatus.current = status;
  }, [status, editor]);

  const draft = editor.value;
  const stamp = useMemo(
    () =>
      cv.data
        ? fingerprint(
            JSON.stringify([
              cv.data.content,
              cv.data.options.photo_id,
              cv.data.options.language,
              cv.data.options.density,
            ]),
          )
        : "0",
    [cv.data],
  );

  if (cv.isPending) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner className="size-7 text-ink-3" />
      </div>
    );
  }
  if (cv.isError) {
    return (
      <div className="mx-auto w-full max-w-[110rem] px-5 py-8 sm:px-8 lg:px-10">
        <ProfileTabs />
        <div className="mx-auto max-w-[36rem] py-16 text-center">
          <h1 className="type-title">Your CV starts with your profile</h1>
          <p className="mt-3 text-ink-2">{cv.error.message}</p>
          <Button asChild className="mt-6">
            <Link to="/profile">Build my profile</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (!draft) return null;

  const saved = cv.data;
  const busy = editor.status === "pending" || editor.status === "saving";
  const working = saved.status === "working";
  const update = editor.update;

  return (
    <div className="mx-auto w-full max-w-[110rem] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <ProfileTabs />
      <header className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <h1 className="type-title">Your CV</h1>
          <p className="mt-2 max-w-[42rem] text-ink-2">
            Made from your profile. Pick a design, polish the words with AI,
            then download it or share a link. Changes save as you type.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SaveIndicator
            status={editor.status}
            onRetry={editor.retry}
            onReload={() => void editor.reload()}
          />
          {busy ? (
            <Button variant="tape" loading>
              Download PDF
            </Button>
          ) : (
            <Button variant="tape" asChild>
              <a href="/api/v1/cv/cv.pdf" download>
                <Download className="size-4" aria-hidden />
                Download PDF
              </a>
            </Button>
          )}
        </div>
      </header>

      {saved.stale && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-tape/60 bg-[color-mix(in_oklab,var(--tape)_10%,var(--surface))] p-4">
          <p className="min-w-[min(100%,18rem)] flex-1 text-[0.9375rem]">
            <span className="font-semibold">
              Your profile changed since this CV was written.
            </span>{" "}
            Start again from your profile to bring it in. Your design stays;
            changes to the words are replaced.
          </p>
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw className="size-3.5" />}
            loading={reset.isPending}
            disabled={busy || working}
            onClick={() =>
              reset.mutate(saved.version, {
                onSuccess: () => void editor.reload(),
                onError: (error) => toast.error(error.message),
              })
            }
          >
            Start again from my profile
          </Button>
        </div>
      )}

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

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] xl:gap-10">
        <div className={cn(view === "preview" && "hidden lg:block")}>
          <Tabs.Root value={tab} onValueChange={setTab}>
            <Tabs.List
              aria-label="CV tools"
              className="mb-5 flex flex-wrap gap-x-1 border-b border-line"
            >
              {TABS.map((item) => (
                <Tabs.Trigger
                  key={item.value}
                  value={item.value}
                  className="relative -mb-px h-11 border-b-[3px] border-transparent px-3 text-[0.9375rem] font-medium text-ink-2 transition-colors hover:text-ink data-[state=active]:border-tape data-[state=active]:text-ink"
                >
                  {item.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <Tabs.Content value="design" className="focus-visible:outline-none">
              <DesignPanel
                draft={{
                  template: draft.template,
                  accent: draft.accent,
                  options: draft.options,
                }}
                update={(recipe) =>
                  update((d) => {
                    const next = recipe({
                      template: d.template,
                      accent: d.accent,
                      options: d.options,
                    });
                    return { ...d, ...next };
                  })
                }
                stamp={stamp}
              />
            </Tabs.Content>
            <Tabs.Content value="words" className="focus-visible:outline-none">
              {working ? (
                <p className="rounded-panel bg-surface-2 p-5 text-ink-2">
                  The AI is editing your words. You can edit again in a moment.
                </p>
              ) : (
                <ResumeEditor
                  resume={draft.content}
                  onChange={(recipe) =>
                    update((d) => ({ ...d, content: recipe(d.content) }))
                  }
                  facts={saved.facts}
                  sections={saved.sections}
                />
              )}
            </Tabs.Content>
            <Tabs.Content value="ai" className="focus-visible:outline-none">
              <AiPanel
                cv={saved}
                busy={busy}
                onChanged={() => void editor.reload()}
              />
            </Tabs.Content>
            <Tabs.Content value="share" className="focus-visible:outline-none">
              <SharePanel
                cv={saved}
                visibility={draft.visibility}
                onVisibility={(visibility) =>
                  update((d) => ({ ...d, visibility }))
                }
              />
            </Tabs.Content>
          </Tabs.Root>
        </div>

        <div
          className={cn(
            "lg:sticky lg:top-6 lg:self-start",
            view === "edit" && "hidden lg:block",
          )}
        >
          <LiveDocument
            src={documentUrl(saved.version)}
            paper={saved.options.paper ?? "A4"}
            title="Your CV"
          />
        </div>
      </div>
    </div>
  );
}
