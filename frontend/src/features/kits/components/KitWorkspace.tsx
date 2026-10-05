import { Check } from "lucide-react";
import { motion } from "motion/react";
import { Tabs } from "radix-ui";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { copyText } from "@/lib/clipboard";
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
import { InterviewPrep } from "../interview/InterviewPrep";
import { useKitProgress } from "../progress";
import { isApplied } from "../status";
import { ApplySteps, type DocumentTab } from "./ApplySteps";
import { DocumentFrame } from "./DocumentFrame";
import {
  CopyTextButton,
  DocumentPanel,
  DownloadButton,
} from "./DocumentPanels";
import { AnswersPanel } from "./ExtrasPanels";
import { LetterEditor } from "./LetterEditor";
import { ResumeEditor } from "./ResumeEditor";
import { TrustStrip } from "./TrustStrip";
import { WritingCard } from "./WritingCard";

interface Draft {
  resume: TailoredResume;
  cover_letter: CoverLetter;
}

const TABS = [
  { value: "resume", label: "CV" },
  { value: "letter", label: "Cover letter" },
  { value: "answers", label: "Form answers" },
  { value: "interview", label: "Interview prep" },
] as const;

type TabValue = (typeof TABS)[number]["value"];
const isTab = (value: string | null): value is TabValue =>
  TABS.some((item) => item.value === value);

/** Each tab's content slides in when it opens. */
function Pane({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** A prepared application: the steps to apply, how it's written, then each document. */
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
  const { progress, mark } = useKitProgress(kit.id);
  // `?tab=interview` (from an interview reminder) opens straight on that tab.
  const [params, setParams] = useSearchParams();
  const linked = params.get("tab");
  const [tab, setTabState] = useState<string>(
    isTab(linked) ? linked : "resume",
  );
  const setTab = (next: string) => {
    setTabState(next);
    if (isTab(next)) setParams({ tab: next }, { replace: true });
  };
  useEffect(() => {
    if (!isTab(linked) || linked === "resume") return;
    document
      .getElementById("application-tabs")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Only on arrival: later tab changes come from the person.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const draft = editor.value;
  if (!draft) return null;
  const busy = editor.status === "pending" || editor.status === "saving";
  const applied = isApplied(kit);
  const ticked: Record<string, boolean> = {
    resume: progress.cv || applied,
    letter: progress.letter || applied,
  };
  const status = (
    <SaveIndicator
      status={editor.status}
      onRetry={editor.retry}
      onReload={() => void editor.reload()}
    />
  );
  const open = (next: DocumentTab) => {
    setTab(next);
    document
      .getElementById("application-tabs")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const copyLetter = () => {
    mark("letter");
    void copyText(
      letterAsText(draft.cover_letter, kit.candidate_name ?? ""),
      "Cover letter",
    );
  };

  return (
    <div className="mt-8 flex flex-col gap-6">
      <ApplySteps
        kit={kit}
        progress={progress}
        onOpen={open}
        onSite={() => mark("site")}
      />
      <WritingCard
        key={`${kit.language}-${kit.tone}-${kit.status}`}
        kit={kit}
      />
      <TrustStrip kit={kit} />

      <Tabs.Root
        id="application-tabs"
        value={tab}
        onValueChange={setTab}
        className="mt-4 scroll-mt-24 lg:scroll-mt-6"
      >
        <Tabs.List
          aria-label="Your application"
          className="flex flex-wrap gap-x-1 border-b border-line"
        >
          {TABS.map((item) => (
            <Tabs.Trigger
              key={item.value}
              value={item.value}
              className="relative flex h-11 items-center gap-1.5 px-3.5 text-[0.9375rem] font-medium text-ink-2 transition-colors hover:text-ink data-[state=active]:text-ink"
            >
              {item.label}
              {ticked[item.value] && (
                <>
                  <Check
                    aria-hidden
                    className="size-3.5 text-fit-strong"
                    strokeWidth={3}
                  />
                  <span className="sr-only">, done</span>
                </>
              )}
              {tab === item.value && (
                <motion.span
                  layoutId="application-tab-line"
                  aria-hidden
                  className="absolute inset-x-1.5 -bottom-px h-[3px] rounded-full bg-tape"
                  transition={{ type: "spring", stiffness: 480, damping: 36 }}
                />
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content
          value="resume"
          className="mt-6 focus-visible:outline-none"
        >
          <Pane>
            <DocumentPanel
              title="Your CV for this job"
              status={status}
              actions={
                <DownloadButton
                  busy={busy}
                  href={documentUrl(kit.id, "resume", "pdf")}
                  primary
                  onDownload={() => mark("cv")}
                >
                  Download CV (PDF)
                </DownloadButton>
              }
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
          </Pane>
        </Tabs.Content>
        <Tabs.Content
          value="letter"
          className="mt-6 focus-visible:outline-none"
        >
          <Pane>
            <DocumentPanel
              title="Your cover letter"
              status={status}
              actions={
                <>
                  <CopyTextButton onCopy={copyLetter} />
                  <DownloadButton
                    busy={busy}
                    href={documentUrl(kit.id, "letter", "pdf")}
                    primary
                    onDownload={() => mark("letter")}
                  >
                    Download PDF
                  </DownloadButton>
                </>
              }
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
          </Pane>
        </Tabs.Content>
        <Tabs.Content
          value="answers"
          className="mt-6 focus-visible:outline-none"
        >
          <Pane>{kit.extras && <AnswersPanel extras={kit.extras} />}</Pane>
        </Tabs.Content>
        <Tabs.Content
          value="interview"
          className="mt-6 focus-visible:outline-none"
        >
          <Pane>
            {kit.extras && (
              <InterviewPrep
                kitId={kit.id}
                extras={kit.extras}
                facts={kit.facts}
              />
            )}
          </Pane>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
