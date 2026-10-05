import { ChevronDown, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import type { Kit } from "../api";
import { trustSummary } from "../status";
import { Keywords, TruthCheck } from "./KitProof";

/** "Why you can trust this": one line, with the full check and keywords on request. */
export function TrustStrip({ kit }: { kit: Kit }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  if (!kit.fact_check && !kit.keywords) return null;

  return (
    <section className="rounded-panel border border-line bg-surface">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-panel p-4 text-left hover:bg-surface-2 sm:px-5"
        >
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--fit-strong)_14%,var(--surface))]"
          >
            <ShieldCheck className="size-5 text-fit-strong" />
          </span>
          <span className="min-w-[min(100%,16rem)] flex-1">
            <span className="block font-semibold">Why you can trust this</span>
            <span className="block text-[0.9375rem] font-normal text-ink-2">
              {trustSummary(kit)}
            </span>
          </span>
          <span className="flex items-center gap-1 text-[0.875rem] font-semibold text-chalk">
            {open ? "Hide details" : "Show details"}
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </span>
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={detailsId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="grid items-start gap-4 border-t border-line p-4 sm:p-5 md:grid-cols-2">
              {kit.fact_check && <TruthCheck check={kit.fact_check} />}
              {kit.keywords && <Keywords report={kit.keywords} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
