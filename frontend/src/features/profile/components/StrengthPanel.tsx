import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { FitTape } from "@/components/ui/FitTape";
import { cn } from "@/lib/cn";
import { scrollToSection, strengthWord } from "../strength";
import type { StrengthOut } from "../types";

/** Where each check is fixed in the builder. */
const CHECK_SECTION: Record<string, string> = {
  identity: "basics",
  contact: "basics",
  links: "basics",
  summary: "summary",
  experience: "experience",
  achievements: "experience",
  metrics: "experience",
  skills: "skills",
  education: "education",
  languages: "languages",
};

/** The profile measured: score on the tape, then what to do next. */
export function StrengthPanel({
  strength,
  compact = false,
}: {
  strength: StrengthOut;
  compact?: boolean;
}) {
  const [showDone, setShowDone] = useState(false);
  const todo = strength.checks.filter((check) => !check.done);
  const done = strength.checks.filter((check) => check.done);

  return (
    <div className="rounded-panel border border-line bg-surface p-5">
      <p className="type-label text-ink-2">Profile strength</p>
      <FitTape
        score={strength.score}
        size={compact ? "md" : "lg"}
        label={strengthWord(strength.score)}
        measure="out of 100"
        showLabel
        className="mt-3"
      />
      {todo.length > 0 ? (
        <div className="mt-5">
          <p className="text-[0.875rem] font-semibold">
            {todo.length === 1
              ? "One thing to add"
              : `${todo.length} things to add`}
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {todo.map((check) => (
              <li key={check.key}>
                <button
                  type="button"
                  onClick={() =>
                    scrollToSection(CHECK_SECTION[check.key] ?? "basics")
                  }
                  className="group w-full rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[0.9375rem] font-medium">
                      {check.label}
                    </span>
                    <span className="shrink-0 text-[0.8125rem] font-semibold text-fit-strong">
                      +{check.weight}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[0.8125rem] text-ink-2">
                    {check.hint}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-5 text-[0.9375rem] text-ink-2"
        >
          Every check passes. Tailr has everything it needs to tailor well.
        </motion.p>
      )}
      {done.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="text-[0.8125rem] font-semibold text-ink-2 hover:text-ink"
          >
            {showDone ? "Hide" : "Show"} what's done ({done.length})
          </button>
          {showDone && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {done.map((check) => (
                <li
                  key={check.key}
                  className={cn(
                    "flex items-center gap-2 text-[0.875rem] text-ink-2",
                  )}
                >
                  <Check className="size-3.5 text-fit-strong" aria-hidden />
                  {check.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
