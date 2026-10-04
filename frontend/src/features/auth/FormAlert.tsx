import { CircleAlert } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

/** The form-level problem message, announced to screen readers. */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5 rounded-control border border-pin/30 bg-pin-soft px-3.5 py-3 text-[0.875rem] text-ink"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-pin" aria-hidden />
      <span>{children}</span>
    </motion.div>
  );
}
