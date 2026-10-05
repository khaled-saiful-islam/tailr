import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A section that opens on demand, so secondary things stay out of the way. */
export function Disclosure({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const body = useId();
  return (
    <section className="rounded-panel border border-line bg-surface">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={body}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-4 rounded-panel px-5 py-4 text-left hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk sm:px-6"
        >
          <span className="min-w-0">
            <span className="block text-[1.0625rem] font-semibold">
              {title}
            </span>
            {summary && (
              <span className="mt-0.5 block text-[0.875rem] text-ink-2">
                {summary}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-ink-3 transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={body}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-5 py-5 sm:px-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
