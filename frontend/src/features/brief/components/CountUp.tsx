import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect } from "react";

/**
 * A number that counts up to its value as it appears. Screen readers get the final value
 * straight away; people who prefer less motion see it without the count.
 */
export function CountUp({
  value,
  delay = 0,
  className,
}: {
  value: number;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const count = useMotionValue(reduce ? value : 0);
  const shown = useTransform(count, (v) => Math.round(v).toString());

  useEffect(() => {
    if (reduce) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, {
      delay,
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [reduce, value, delay, count]);

  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <motion.span aria-hidden>{shown}</motion.span>
    </span>
  );
}
