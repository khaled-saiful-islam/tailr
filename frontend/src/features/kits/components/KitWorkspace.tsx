import { Tabs } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Segmented } from "@/components/ui/choice";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";
import { useVersionedAutosave } from "@/lib/useVersionedAutosave";
import { SaveIndicator } from "@/features/profile/components/SaveIndicator";
import {
  documentUrl,
  useSaveKit,
  type CoverLetter,
  type Kit,
  type TailoredResume,
} from "../api";
import { letterAsText } from "../edit";
import { ApplySteps } from "./ApplySteps";
import { DocumentFrame } from "./DocumentFrame";
import { AnswersPanel, InterviewPanel } from "./ExtrasPanels";
import { KitProof } from "./KitProof";
import { LetterEditor } from "./LetterEditor";
import { ResumeEditor } from "./ResumeEditor";

interface Draft {
  resume: TailoredResume;
  cover_letter: CoverLetter;
}

const TABS = [
  { value: "resume", label: "CV" },
  { value: "letter", label: "Cover letter" },
  { value: "answers", label: "Answers" },
  { value: "interview", label: "Interview prep" },
] as const;

/** A prepared application: the steps to apply, the check, then each document to edit. */
export function KitWorkspace({
  kit,
  reload,
}: {
  kit: Kit;
  reload: () => Promise<Kit | undefined>;
}) {
  const save = useSaveKit(kit.id);
  const editor = useVersionedAutosave<Kit, Draft>({
    data: kit,
    read: (k) => ({
      value: { resume: k.resume!, cover_letter: k.cover_letter! },
      version: k.version,
    }),
    save: ({ value, version }, callbacks) =>
      save.mutate(
        { version, resume: value.resume, cover_letter: value.cover_letter },
        {
          onSuccess: (saved) => callbacks.onSuccess(saved.version),
          onError: callbacks.onError,
        },
      ),
    refetch: reload,
  });
  const [tab, setTab] = useState<string>("resume");
  const draft = editor.value;
  if (!draft) return null;
  const busy = editor.status === "pending" || editor.status === "saving";

  return (
    <>
      <ApplySteps
        kit={kit}
        busy={busy}
        onOpen={(next) => {
          setTab(next);
          document
            .getElementById("application-tabs")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onCopyLetter={() =>
          void copyText(
            letterAsText(draft.cover_letter, kit.candidate_name ?? ""),
            "Cover letter",
          )
        }
      />
      <div className="mt-4 flex justify-end">
        <SaveIndicator
          status={editor.status}
          onRetry={editor.retry}
          onReload={() => void editor.reload()}
        />
      </div>

      <div className="mt-6">
        <KitProof kit={kit} />
      </div>

      <Tabs.Root
        id="application-tabs"
        value={tab}
        onValueChange={setTab}
        className="mt-10 scroll-mt-6"
      >
        <Tabs.List
          aria-label="Your application"
          className="flex flex-wrap gap-x-1 border-b border-line"
        >
          {TABS.map((item) => (
            <Tabs.Trigger
              key={item.value}
              value={item.value}
              className={cn(
                "relative -mb-px h-11 px-3.5 text-[0.9375rem] font-medium text-ink-2 transition-colors hover:text-ink",
                "border-b-[3px] border-transparent data-[state=active]:border-tape data-[state=active]:text-ink",
              )}
            >
              {item.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content
          value="resume"
          className="mt-6 focus-visible:outline-none"
        >
          <EditAndPreview
            editor={
              <ResumeEditor
                resume={draft.resume}
                onChange={(recipe) =>
                  editor.update((d) => ({ ...d, resume: recipe(d.resume) }))
                }
                facts={kit.facts}
                sections={kit.sections}
              />
            }
            preview={
              <DocumentFrame
                src={documentUrl(kit.id, "resume", "html", kit.version)}
                title="CV preview"
              />
            }
          />
        </Tabs.Content>
        <Tabs.Content
          value="letter"
          className="mt-6 focus-visible:outline-none"
        >
          <EditAndPreview
            editor={
              <LetterEditor
                letter={draft.cover_letter}
                onChange={(recipe) =>
                  editor.update((d) => ({
                    ...d,
                    cover_letter: recipe(d.cover_letter),
                  }))
                }
              />
            }
            preview={
              <DocumentFrame
                src={documentUrl(kit.id, "letter", "html", kit.version)}
                title="Cover letter preview"
              />
            }
          />
        </Tabs.Content>
        <Tabs.Content
          value="answers"
          className="mt-6 focus-visible:outline-none"
        >
          {kit.extras && <AnswersPanel extras={kit.extras} />}
        </Tabs.Content>
        <Tabs.Content
          value="interview"
          className="mt-6 focus-visible:outline-none"
        >
          {kit.extras && (
            <InterviewPanel extras={kit.extras} facts={kit.facts} />
          )}
        </Tabs.Content>
      </Tabs.Root>
    </>
  );
}

/** Editor and live preview side by side on wide screens; a switch between them on narrow ones. */
function EditAndPreview({
  editor,
  preview,
}: {
  editor: ReactNode;
  preview: ReactNode;
}) {
  const [view, setView] = useState<"edit" | "preview">("edit");
  return (
    <>
      <div className="mb-5 lg:hidden">
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
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={cn(view === "preview" && "hidden lg:block")}>
          <p className="mb-5 text-[0.9375rem] text-ink-2">
            Change anything. Edits save as you type and show up in the preview
            and the PDF. Tailr checked what it wrote; what you change is up to
            you.
          </p>
          {editor}
        </div>
        <div
          className={cn(
            "lg:sticky lg:top-6 lg:self-start",
            view === "edit" && "hidden lg:block",
          )}
        >
          {preview}
        </div>
      </div>
    </>
  );
}
