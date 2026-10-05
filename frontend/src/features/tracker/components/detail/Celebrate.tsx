import { motion, useReducedMotion } from "motion/react";

const COLORS = [
  "var(--tape)",
  "var(--chalk)",
  "var(--fit-strong)",
  "var(--pin)",
];
const PIECES = 14;

/**
 * A short burst of confetti from a point: for the big steps (an interview, an offer).
 * Once, about a second, and nothing at all for people who prefer less motion.
 */
export function Celebrate() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-10"
    >
      {Array.from({ length: PIECES }, (_, index) => {
        const angle = (index / PIECES) * Math.PI * 2;
        const reach = 34 + (index % 3) * 12;
        return (
          <motion.span
            key={index}
            className="absolute size-2 rounded-[2px]"
            style={{ background: COLORS[index % COLORS.length] }}
            initial={{ x: -4, y: -4, scale: 0.4, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * reach - 4,
              y: Math.sin(angle) * reach - 4 + 10,
              scale: 1,
              opacity: 0,
              rotate: 180 + index * 25,
            }}
            transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </span>
  );
}
