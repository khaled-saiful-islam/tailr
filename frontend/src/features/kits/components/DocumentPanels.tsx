import { Copy, Download } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/choice";
import { cn } from "@/lib/cn";

/** A PDF download that waits while edits are still saving, so the file has them. */
export function DownloadButton({
  busy,
  href,
  primary = false,
  onDownload,
  children,
}: {
  busy: boolean;
  href: string;
  primary?: boolean;
  onDownload: () => void;
  children: ReactNode;
}) {
  const variant = primary ? "tape" : "secondary";
  if (busy)
    return (
      <Button size="sm" variant={variant} loading>
        {children}
      </Button>
    );
  return (
    <Button size="sm" variant={variant} asChild>
      <a href={href} download onClick={onDownload}>
        <Download className="size-3.5" aria-hidden />
        {children}
      </a>
    </Button>
  );
}

export function CopyTextButton({ onCopy }: { onCopy: () => void }) {
  return (
    <Button
      size="sm"
      variant="secondary"
      icon={<Copy className="size-3.5" />}
      onClick={onCopy}
    >
      Copy text
    </Button>
  );
}

/**
 * One document: what you can do with it on top, then the editor and the live preview side
 * by side on wide screens, or a switch between them on narrow ones.
 */
export function DocumentPanel({
  title,
  actions,
  status,
  editor,
  preview,
}: {
  title: string;
  actions: ReactNode;
  status: ReactNode;
  editor: ReactNode;
  preview: ReactNode;
}) {
  const [view, setView] = useState<"edit" | "preview">("edit");
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-panel border border-line bg-surface-2 px-4 py-3">
        <div className="min-w-[min(100%,18rem)] flex-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-[0.875rem] text-ink-2">
            Change anything below. Edits save as you type and show up in the
            preview and the PDF.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status}
          {actions}
        </div>
      </div>
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
