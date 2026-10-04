/** Blueprint's drawing details, shared by its parts. */
import type { ReactNode } from "react";
import { DrawLine } from "../../motion";

export const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] px-4 font-pg-mono text-[0.8125rem] font-semibold transition-colors";
export const solid = `${button} bg-pg-accent text-pg-accent-ink hover:brightness-110`;
export const outline = `${button} border border-pg-ink/30 text-pg-ink hover:border-pg-ink hover:bg-pg-ink/[0.04]`;
export const grid =
  "[background-image:linear-gradient(var(--pg-grid)_1px,transparent_1px),linear-gradient(90deg,var(--pg-grid)_1px,transparent_1px)]";

/** Corner marks around a frame, like crop marks on a drawing. */
export function Ticks() {
  const corner = "absolute size-3 border-pg-accent";
  return (
    <span aria-hidden className="pointer-events-none absolute -inset-[5px]">
      <span className={`${corner} left-0 top-0 border-l-2 border-t-2`} />
      <span className={`${corner} right-0 top-0 border-r-2 border-t-2`} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} />
    </span>
  );
}

export function SectionTitle({
  index,
  id,
  children,
}: {
  index: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-4">
        <span className="shrink-0 font-pg-mono text-[0.75rem] text-pg-accent">
          {index}
        </span>
        <h2
          id={id}
          className="font-pg-display text-[1.6rem] font-bold leading-tight [font-stretch:115%]"
        >
          {children}
        </h2>
      </div>
      <DrawLine className="mt-3 h-px bg-pg-line" />
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
    <section aria-label={label} className="py-12 first:pt-0 @5xl:py-16">
      {children}
    </section>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[4px] border border-pg-line bg-pg-2/80 px-2 py-1 font-pg-mono text-[0.75rem]">
      {children}
    </span>
  );
}
