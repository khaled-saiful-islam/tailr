/** Poster's building blocks: chunky buttons, sticker colours, big shapes, headings. */
import { motion } from "motion/react";
import type { ReactNode } from "react";

export const chunky =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[1rem] font-bold transition-transform active:scale-[0.97]";
export const solid = `${chunky} bg-pg-ink text-pg hover:-translate-y-0.5`;
export const outline = `${chunky} border-2 border-pg-ink hover:-translate-y-0.5`;
export const card = "rounded-[28px] bg-pg-2 shadow-[0_2px_0_rgb(0_0_0/0.06)]";
export const chip =
  "rounded-full border-2 border-pg-ink px-4 py-1.5 font-semibold";

/** The big circles behind the hero; they spring into place once. */
export function Shapes() {
  const shape = (delay: number) => ({
    initial: { scale: 0, rotate: -20 },
    animate: { scale: 1, rotate: 0 },
    transition: { type: "spring" as const, stiffness: 120, damping: 14, delay },
  });
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <motion.span
        {...shape(0.1)}
        className="absolute -right-[12cqi] -top-[14cqi] size-[48cqi] rounded-full bg-pg-accent"
      />
      <motion.span
        {...shape(0.25)}
        className="absolute right-[24cqi] top-[18cqi] size-[12cqi] rounded-full bg-pg-accent-2"
      />
      <motion.span
        {...shape(0.4)}
        className="absolute -right-[4cqi] top-[34cqi] size-[16cqi] rounded-full border-[1.6cqi] border-pg-accent-3"
      />
    </div>
  );
}

/** The page's width and side padding. */
export function Wrap({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[84rem] px-5 @3xl:px-10 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function Section({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={label} className="py-14 @3xl:py-20">
      <Wrap>
        <h2
          data-fit
          className="font-pg-display text-[clamp(2rem,6cqi,3.75rem)] font-extrabold leading-[1] tracking-[-0.03em]"
        >
          {title}
        </h2>
        <div className="mt-8 @3xl:mt-10">{children}</div>
      </Wrap>
    </section>
  );
}

export function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-pg-2 px-4 py-2 font-semibold shadow-[0_2px_0_rgb(0_0_0/0.06)] ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
