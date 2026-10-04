/** The pieces every AI suggestion on My website shares: start it, wait, look, use. */
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { CaseStudy } from "../api";

export function DraftButton({
  label,
  runningLabel = "Drafting…",
  running,
  onClick,
  variant = "secondary",
}: {
  label: string;
  runningLabel?: string;
  running: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <Button
      size="sm"
      variant={variant}
      icon={<Sparkles className="size-3.5" />}
      loading={running}
      onClick={onClick}
    >
      {running ? runningLabel : label}
    </Button>
  );
}

/** Shown while the work runs on the server: the page stays yours to use. */
export function WorkingNote({
  stage,
  wait = "About 20 seconds",
  result = "your draft",
}: {
  stage: string | null;
  wait?: string;
  result?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-control bg-surface-2 px-3.5 py-2.5 text-[0.875rem]">
      <Spinner className="mt-0.5 size-4 shrink-0 text-chalk" label="Working" />
      <p>
        <span className="font-semibold">{stage ?? "Starting"}.</span>{" "}
        <span className="text-ink-2">
          {wait}. You can keep working; {result} will show up here.
        </span>
      </p>
    </div>
  );
}

/** A suggestion to look at before it replaces anything. */
export function Suggestion({
  title,
  children,
  useLabel = "Use this",
  onUse,
  onDismiss,
}: {
  title: string;
  children: ReactNode;
  useLabel?: string;
  onUse: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-5 rounded-panel border border-chalk/40 bg-chalk-soft p-4">
      <p className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-chalk">
        <Sparkles className="size-3.5 shrink-0" aria-hidden /> {title}
      </p>
      <div className="mt-2 text-[0.9375rem]">{children}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={onUse}>
          {useLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

/** What the AI couldn't write because the profile doesn't say. */
export function NeedsInput({
  items,
  onClose,
}: {
  items: string[];
  /** Given when nothing else was drafted, so the note can be put away. */
  onClose?: () => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mb-5 rounded-control bg-surface-2 px-3.5 py-2.5 text-[0.875rem]">
      <p className="font-semibold">Tailr needs more from you for:</p>
      <ul className="mt-1 list-disc pl-5 text-ink-2">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-1 text-ink-3">
        Add it to your profile and draft again, or write it yourself.
      </p>
      {onClose && (
        <Button size="sm" variant="ghost" className="mt-2" onClick={onClose}>
          Got it
        </Button>
      )}
    </div>
  );
}

/** A drafted case study for one project, ready to use. */
export function CaseDraft({
  study,
  onUse,
  onSkip,
}: {
  study: CaseStudy;
  onUse: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="w-full rounded-control border border-chalk/40 bg-chalk-soft p-3 text-[0.875rem]">
      <p className="font-semibold text-chalk">A drafted case study is ready.</p>
      <p className="mt-1 text-ink-2">{study.overview ?? study.problem}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" onClick={onUse}>
          Use this
        </Button>
        <Button size="sm" variant="ghost" onClick={onSkip}>
          Not now
        </Button>
      </div>
    </div>
  );
}
