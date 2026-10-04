import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A sheet laid over the page. Focus is trapped inside; Escape closes it. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-[tailr-fade_160ms_ease-out]" />
        <RadixDialog.Content
          className={cn(
            "fixed left-1/2 top-[max(1rem,8vh)] z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[34rem] -translate-x-1/2 overflow-y-auto",
            "rounded-sheet border border-line bg-surface p-5 shadow-sheet sm:p-7",
            "data-[state=open]:animate-[tailr-rise_220ms_cubic-bezier(0.22,1,0.36,1)]",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <RadixDialog.Title className="type-heading">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close
              aria-label="Close"
              className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-[9px] text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-4.5" aria-hidden />
            </RadixDialog.Close>
          </div>
          {description ? (
            <RadixDialog.Description className="mt-1.5 text-[0.9375rem] text-ink-2">
              {description}
            </RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">
              {title}
            </RadixDialog.Description>
          )}
          <div className="mt-5">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
