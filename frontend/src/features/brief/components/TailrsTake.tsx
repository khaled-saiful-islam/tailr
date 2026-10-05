import { Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * Tailr's one-line read on a job, written by the AI. The label and chalk-blue edge mark it
 * as Tailr's opinion (no underline, so it never looks like a link), and it arrives just
 * after the match tape finishes measuring.
 */
export function TailrsTake({
  text,
  className,
  large = false,
}: {
  text: string;
  className?: string;
  large?: boolean;
}) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-control border-l-2 border-chalk bg-chalk-soft/50 px-4 py-3",
        className,
      )}
    >
      <figcaption className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-chalk">
        <Sparkles className="size-3.5 shrink-0" aria-hidden />
        Tailr's take
      </figcaption>
      <p
        className={cn(
          "mt-1 leading-relaxed text-ink",
          large && "text-[1.0625rem]",
        )}
      >
        {text}
      </p>
    </motion.figure>
  );
}
