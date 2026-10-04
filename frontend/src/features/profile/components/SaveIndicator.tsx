import { Check, CircleAlert, CloudUpload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Spinner } from "@/components/ui/Spinner";
import type { SaveStatus } from "../hooks/useProfileEditor";

interface SaveIndicatorProps {
  status: SaveStatus;
  onRetry: () => void;
  onReload: () => void;
}

/** Quiet confirmation that typing is being saved; loud only when it isn't. */
export function SaveIndicator({ status, onRetry, onReload }: SaveIndicatorProps) {
  // Idle: keep the live region (so later changes are announced) but take no space.
  if (status === "idle") return <div aria-live="polite" className="sr-only" />;
  return (
    <div aria-live="polite" className="min-h-9 text-[0.875rem]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="flex h-9 items-center gap-2"
        >
          {status === "pending" && (
            <>
              <CloudUpload className="size-4 text-ink-3" aria-hidden />
              <span className="text-ink-3">Unsaved changes</span>
            </>
          )}
          {status === "saving" && (
            <>
              <Spinner className="size-4 text-ink-3" label="Saving" />
              <span className="text-ink-3">Saving</span>
            </>
          )}
          {status === "saved" && (
            <>
              <Check className="size-4 text-fit-strong" aria-hidden />
              <span className="text-ink-2">Saved</span>
            </>
          )}
          {status === "error" && (
            <>
              <CircleAlert className="size-4 text-pin" aria-hidden />
              <span className="text-ink">Couldn't save.</span>
              <button type="button" onClick={onRetry} className="font-semibold text-chalk hover:underline">
                Try again
              </button>
            </>
          )}
          {status === "conflict" && (
            <>
              <CircleAlert className="size-4 text-pin" aria-hidden />
              <span className="text-ink">Changed in another tab.</span>
              <button type="button" onClick={onReload} className="font-semibold text-chalk hover:underline">
                Load latest
              </button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
