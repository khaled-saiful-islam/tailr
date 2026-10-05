import { motion, type HTMLMotionProps } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1] as const;

interface RevealProps extends HTMLMotionProps<"div"> {
  /** Seconds to wait, to line a reveal up after another. */
  delay?: number;
  /** How far it rises, in pixels. */
  rise?: number;
}

/**
 * Fades and rises into place the first time it scrolls into view. Use it for a page's
 * one orchestrated moment (a hero, a result), not on every block.
 */
export function Reveal({ delay = 0, rise = 14, ...props }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: rise }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      {...props}
    />
  );
}
