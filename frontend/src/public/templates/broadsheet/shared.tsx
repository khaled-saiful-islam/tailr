/** Broadsheet's typesetting details, shared by its parts. */
import type { ReactNode } from "react";
import { DrawLine } from "../../motion";

/** The interface face (Schibsted Grotesk): kickers, bylines, buttons. */
export const ui = "font-pg-mono";

export const textLink = `${ui} inline-flex items-center gap-1.5 text-[0.875rem] font-semibold underline decoration-pg-ink/30 underline-offset-4 transition-colors hover:text-pg-accent hover:decoration-pg-accent`;

const button = `${ui} inline-flex min-h-11 items-center justify-center gap-2 px-5 text-[0.875rem] font-semibold transition-colors`;
export const solid = `${button} bg-pg-ink text-pg hover:bg-pg-accent hover:text-pg-accent-ink`;
export const outline = `${button} border border-pg-ink text-pg-ink hover:bg-pg-ink hover:text-pg`;

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className={`${ui} text-[0.8125rem] font-semibold text-pg-accent`}>
      {children}
    </p>
  );
}

/** A section opens with a heavy rule and a hairline drawn beneath it. */
export function SectionHead({
  title,
  kicker,
  id,
}: {
  title: string;
  kicker?: string;
  id?: string;
}) {
  return (
    <div className="mb-8">
      <div className="h-[3px] bg-pg-ink" aria-hidden />
      <DrawLine className="mt-[3px] h-px bg-pg-ink" />
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2
          id={id}
          className="font-pg-display text-[2rem] font-semibold leading-tight tracking-[-0.01em]"
        >
          {title}
        </h2>
        {kicker && (
          <span className={`${ui} text-[0.8125rem] text-pg-ink-3`}>
            {kicker}
          </span>
        )}
      </div>
    </div>
  );
}

export function Section({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <section aria-label={label} className="mt-16 first:mt-0">
      {children}
    </section>
  );
}
