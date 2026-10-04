/**
 * Stamp's building blocks: thick ink borders, hard offset shadows that buttons press
 * into, tilted sticker labels, two-tone headlines, and printed paper backgrounds.
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE } from "../../motion";
import { PAPER, type Paper } from "./styles";

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
      className={`mx-auto w-full max-w-[82rem] px-5 @3xl:px-10 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/** A tilted label in ink (or paper, on dark), with a stamp under it. */
export function Sticker({
  children,
  className,
  tilt = -2,
  tone = "ink",
  stamp = "red",
}: {
  children: ReactNode;
  className?: string;
  tilt?: number;
  tone?: "ink" | "paper";
  stamp?: "red" | "ink";
}) {
  const colours =
    tone === "ink"
      ? "bg-pg-ink text-pg"
      : "bg-(--stamp-night-ink) text-(--stamp-night)";
  const under =
    stamp === "red"
      ? "shadow-[4px_4px_0_var(--pg-accent)]"
      : "shadow-[4px_4px_0_var(--pg-ink)]";
  return (
    <span
      style={{ rotate: `${tilt}deg` }}
      className={`inline-flex items-center gap-2 px-3.5 py-2 text-[0.8125rem] font-bold uppercase tracking-[0.1em] ${colours} ${under} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

/** Words that rise into place; the last `accent` words print in red. */
export function Stamped({
  text,
  accent = 1,
  delay = 0,
  red: redClass = "text-pg-accent",
}: {
  text: string;
  accent?: number;
  delay?: number;
  red?: string;
}) {
  const words = text.trim().split(/\s+/);
  const from = Math.max(words.length - accent, 0);
  return (
    <>
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <span className="inline-block overflow-hidden pb-[0.06em] align-bottom">
            <motion.span
              className={`inline-block ${index >= from ? redClass : ""}`}
              initial={{ y: "105%" }}
              animate={{ y: "0%" }}
              transition={{
                duration: 0.7,
                ease: EASE,
                delay: delay + index * 0.05,
              }}
            >
              {word}
            </motion.span>
          </span>
          {index < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

/** A section of printed paper: a sticker, a giant two-tone title, a thick rule. */
export function Section({
  id,
  label,
  title,
  accent,
  note,
  paper = "plain",
  aside,
  children,
}: {
  id?: string;
  label: string;
  title: string;
  /** The words printed in red, after the title. */
  accent: string;
  note?: string;
  paper?: Paper;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const onRed = paper === "red";
  return (
    <section
      id={id}
      aria-label={`${title} ${accent}`}
      className={`border-t-[3px] border-pg-line py-16 @3xl:py-24 ${PAPER[paper]}`}
    >
      <Wrap>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
          <div className="min-w-0">
            <Sticker
              tone={paper === "night" ? "paper" : "ink"}
              stamp={onRed ? "ink" : "red"}
            >
              {label}
            </Sticker>
            <h2
              data-fit
              className="mt-6 font-pg-display text-[clamp(2.5rem,8cqi,6.25rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.045em]"
            >
              {title}{" "}
              <span className={onRed ? "text-pg-ink" : "text-pg-accent"}>
                {accent}
              </span>
            </h2>
            {note && (
              <p className="mt-5 max-w-[46rem] text-[clamp(0.9375rem,1.6cqi,1.125rem)] font-semibold uppercase leading-relaxed tracking-[0.1em]">
                {note}
              </p>
            )}
          </div>
          {aside}
        </div>
        <div
          aria-hidden
          className={`mt-8 h-[5px] ${onRed ? "bg-pg-ink" : "bg-current"}`}
        />
        <div className="mt-10 @3xl:mt-12">{children}</div>
      </Wrap>
    </section>
  );
}
