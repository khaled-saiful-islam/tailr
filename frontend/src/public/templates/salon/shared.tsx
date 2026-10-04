/** Salon's gallery details, shared by its parts. */
import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { EASE } from "../../motion";

export const pill =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[0.9375rem] font-semibold transition-colors";
export const solid = `${pill} bg-pg-ink text-pg hover:bg-pg-accent hover:text-pg-accent-ink`;
export const ghost = `${pill} border border-pg-ink/20 hover:border-pg-ink`;

/** A section with its museum label in a narrow column on the left. */
export function LabelSection({
  label,
  id,
  children,
}: {
  label: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="mt-16 grid gap-6 border-t border-pg-line pt-10 @4xl:grid-cols-[14rem_minmax(0,1fr)]"
    >
      <h2 id={id} className="font-pg-display text-[1.25rem] font-bold">
        {label}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

const curtain = {
  hidden: { clipPath: "inset(100% 0% 0% 0%)" },
  shown: { clipPath: "inset(0% 0% 0% 0%)" },
};
const settle = { hidden: { scale: 1.08 }, shown: { scale: 1 } };

/**
 * A picture revealed behind a curtain, easing from slightly zoomed in.
 *
 * The outer box watches the viewport: browsers count a fully clipped element as
 * out of view, so the clipped box itself would never start its own reveal.
 */
export function Curtain({
  src,
  alt,
  width,
  height,
  delay = 0,
  className,
}: {
  src: string;
  alt: string;
  width?: number | null;
  height?: number | null;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.15 }}
    >
      <motion.div
        className="overflow-hidden bg-pg-2"
        variants={curtain}
        transition={{ duration: 1, ease: EASE, delay }}
      >
        <motion.img
          src={src}
          alt={alt}
          loading="lazy"
          width={width ?? undefined}
          height={height ?? undefined}
          className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          variants={settle}
          transition={{ duration: 1.4, ease: EASE, delay }}
        />
      </motion.div>
    </motion.div>
  );
}

/** On mouse and trackpad only: a small "View" label that follows the pointer over the work. */
export function ViewTag({ area }: { area: RefObject<HTMLElement | null> }) {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40 });
  const sy = useSpring(y, { stiffness: 500, damping: 40 });
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = area.current;
    if (!element || !matchMedia("(pointer: fine)").matches) return;
    const move = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      x.set(event.clientX - box.left + 14);
      y.set(event.clientY - box.top + 14);
      setShown(
        Boolean((event.target as HTMLElement).closest("[data-view-tag]")),
      );
    };
    const leave = () => setShown(false);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
    };
  }, [area, x, y]);

  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-10 rounded-full bg-pg-accent px-3 py-1 text-[0.8125rem] font-semibold text-pg-accent-ink"
      style={{ x: sx, y: sy }}
      animate={{ opacity: shown ? 1 : 0, scale: shown ? 1 : 0.6 }}
      transition={{ duration: 0.18 }}
    >
      View
    </motion.span>
  );
}
