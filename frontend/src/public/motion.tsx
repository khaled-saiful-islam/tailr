/**
 * The motion kit every template shares. One choreographed entrance, then small
 * reveals that play once. MotionConfig (reducedMotion="user") in PageView turns
 * movement into plain fades for people who ask their device for less motion.
 */
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Fades and lifts into place the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const entrance: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};

/** The hero's entrance: children rise one after another. Wrap each part in <Rise>. */
export function Entrance({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={entrance}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function Rise({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={rise}>
      {children}
    </motion.div>
  );
}

/** Text that rises from behind its own baseline, like type being set. */
export function MaskRise({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          aria-hidden
          className="inline-block overflow-hidden pb-[0.08em] align-bottom"
        >
          <motion.span
            className="inline-block"
            initial={{ y: "105%" }}
            animate={{ y: "0%" }}
            transition={{
              duration: 0.8,
              delay: delay + index * 0.06,
              ease: EASE,
            }}
          >
            {word}
            {index < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** A rule that draws itself across when it comes into view. */
export function DrawLine({
  className,
  vertical = false,
  delay = 0,
}: {
  className?: string;
  vertical?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      aria-hidden
      className={className}
      style={{ originX: 0, originY: 0 }}
      initial={vertical ? { scaleY: 0 } : { scaleX: 0 }}
      whileInView={vertical ? { scaleY: 1 } : { scaleX: 1 }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{ duration: vertical ? 1.4 : 0.9, delay, ease: EASE }}
    />
  );
}

const NUMBER = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/;

/** "40,000" counts up from zero once, in under a second. Anything else is shown as is. */
export function CountUp({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const match = NUMBER.exec(value);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (!match || !inView || reduce) return;
    const [, prefix, digits = "0", suffix] = match;
    const target = Number(digits.replace(/,/g, ""));
    const decimals = digits.includes(".")
      ? (digits.split(".")[1]?.length ?? 0)
      : 0;
    const grouped = digits.includes(",");
    const format = (n: number) =>
      `${prefix}${n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: grouped,
      })}${suffix}`;
    setShown(format(0));
    const controls = animate(0, target, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (n) => setShown(format(n)),
      onComplete: () => setShown(value),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="tabular-nums">
        {shown}
      </span>
    </span>
  );
}
