import { motion, type HTMLMotionProps, type Variants } from "motion/react";
import { EASE } from "./Reveal";

const list: Variants = {
  hidden: {},
  shown: (gap: number) => ({ transition: { staggerChildren: gap } }),
};

const entry: Variants = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

type ListTag = "ul" | "ol" | "div";

interface StaggerProps extends HTMLMotionProps<"div"> {
  as?: ListTag;
  /** Seconds between one item and the next. */
  gap?: number;
  /** Start when scrolled into view (default) or straight away. */
  inView?: boolean;
}

/**
 * A list whose items arrive one after another. Wrap each child in `StaggerItem`.
 * Keep lists short (a dozen or so) or the last items wait too long.
 */
export function Stagger({
  as = "div",
  gap = 0.05,
  inView = true,
  ...props
}: StaggerProps) {
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      variants={list}
      custom={gap}
      initial="hidden"
      {...(inView
        ? { whileInView: "shown", viewport: { once: true, amount: 0.1 } }
        : { animate: "shown" })}
      {...props}
    />
  );
}

type ItemTag = "li" | "div";

export function StaggerItem({
  as = "div",
  ...props
}: HTMLMotionProps<"div"> & { as?: ItemTag }) {
  const Tag = motion[as] as typeof motion.div;
  return <Tag variants={entry} {...props} />;
}
