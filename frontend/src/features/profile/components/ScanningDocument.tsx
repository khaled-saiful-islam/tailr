import {
  BriefcaseBusiness,
  Check,
  GraduationCap,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export type ScanStage = "uploading" | "reading" | "understanding" | "done";

interface Found {
  label: string;
  icon: LucideIcon;
  /** Where the label sits beside the page, as a share of its height. */
  top: string;
  side: "left" | "right";
}

const FOUND: Found[] = [
  { label: "Experience", icon: BriefcaseBusiness, top: "26%", side: "right" },
  { label: "Achievements", icon: Trophy, top: "44%", side: "left" },
  { label: "Skills", icon: Sparkles, top: "62%", side: "right" },
  { label: "Education", icon: GraduationCap, top: "80%", side: "left" },
];

/** The lines of a CV page: a name, a title, then sections of text. */
const SECTIONS = [
  [92, 86, 74, 0, 88, 64],
  [90, 82, 0, 78, 70],
  [84, 60, 76],
  [70, 52],
];

/** How many labels have popped out: one more every 4.5 seconds while Tailr understands,
 * so they unfold across a typical 20 to 40 second read. */
function useFound(stage: ScanStage): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (stage !== "understanding") return;
    const timer = window.setInterval(
      () => setCount((value) => Math.min(value + 1, FOUND.length)),
      4500,
    );
    return () => window.clearInterval(timer);
  }, [stage]);
  if (stage === "done") return FOUND.length;
  return stage === "understanding" ? count : 0;
}

function Corner({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn("absolute size-7 border-chalk", className)}
    />
  );
}

/**
 * A CV page under a scanner: a beam sweeps it while the text is read, then the parts
 * Tailr recognises pop out beside it. Purely visual; the status beside it says what's
 * happening in words.
 */
export function ScanningDocument({
  stage,
  still = false,
}: {
  stage: ScanStage;
  /** Stop the beam (the read failed). */
  still?: boolean;
}) {
  const reduce = useReducedMotion();
  const found = useFound(stage);
  const scanning = stage !== "done" && !still;

  return (
    <div
      aria-hidden
      className="relative mx-auto w-full max-w-[30rem] px-6 py-6 sm:px-10"
    >
      <Corner className="left-2 top-2 border-l-[3px] border-t-[3px] rounded-tl-[10px] sm:left-6" />
      <Corner className="right-2 top-2 border-r-[3px] border-t-[3px] rounded-tr-[10px] sm:right-6" />
      <Corner className="bottom-2 left-2 border-b-[3px] border-l-[3px] rounded-bl-[10px] sm:left-6" />
      <Corner className="bottom-2 right-2 border-b-[3px] border-r-[3px] rounded-br-[10px] sm:right-6" />

      <div className="relative aspect-[210/297] w-full overflow-hidden rounded-doc bg-white p-[9%] shadow-sheet">
        <div className="h-3.5 w-[46%] rounded-full bg-[#14213d]" />
        <div className="mt-2.5 h-2.5 w-[30%] rounded-full bg-[#9aa6bd]" />
        <div className="mt-7 flex flex-col gap-6">
          {SECTIONS.map((lines, section) => {
            const lit = found > section;
            return (
              <div key={section} className="flex flex-col gap-2.5">
                <div
                  className={cn(
                    "h-2.5 w-[24%] rounded-full transition-colors duration-500",
                    lit ? "bg-chalk" : "bg-[#c9d1df]",
                  )}
                />
                {lines.map((width, line) =>
                  width === 0 ? (
                    <div key={line} className="h-1" />
                  ) : (
                    <div
                      key={line}
                      className={cn(
                        "h-2 rounded-full transition-colors duration-500",
                        lit ? "bg-chalk-soft" : "bg-[#eef1f6]",
                      )}
                      style={{ width: `${width}%` }}
                    />
                  ),
                )}
              </div>
            );
          })}
        </div>

        {scanning && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 h-24 -translate-y-full"
            initial={{ top: "0%" }}
            animate={reduce ? { top: "50%" } : { top: ["0%", "100%", "0%"] }}
            transition={
              reduce
                ? { duration: 0 }
                : {
                    duration: stage === "understanding" ? 3.2 : 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
          >
            <div className="h-full bg-gradient-to-b from-transparent to-chalk/15" />
            <div className="h-[3px] bg-chalk shadow-[0_0_18px_4px_var(--chalk)]" />
          </motion.div>
        )}

        {stage === "done" && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 grid place-items-center bg-white/60"
          >
            <span className="grid size-16 place-items-center rounded-full bg-fit-strong text-white shadow-sheet">
              <Check className="size-8" strokeWidth={3} />
            </span>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {FOUND.slice(0, found).map((item) => (
          <motion.span
            key={item.label}
            initial={{
              opacity: 0,
              scale: 0.6,
              x: item.side === "right" ? -24 : 24,
            }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            style={{ top: item.top }}
            className={cn(
              "absolute flex items-center gap-1.5 rounded-full border border-chalk/30 bg-surface px-3 py-1.5 text-[0.8125rem] font-semibold text-ink shadow-sheet",
              item.side === "right"
                ? "right-0 sm:-right-3"
                : "left-0 sm:-left-3",
            )}
          >
            <item.icon className="size-3.5 text-chalk" />
            {item.label}
            <Check className="size-3.5 text-fit-strong" strokeWidth={3} />
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
