import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ApplicationDetail } from "../../../api";
import type { Stage } from "../../../stages";

export interface NowProps {
  app: ApplicationDetail;
  onMove: (stage: Stage) => void;
}

const BAR = {
  act: "bg-tape",
  wait: "bg-chalk",
  good: "bg-fit-strong",
  closed: "bg-line-strong",
} as const;

/** The main card on an application's page: what to do now, said once, with its buttons. */
export function NowShell({
  title,
  lead,
  tone = "act",
  children,
}: {
  title: string;
  lead?: ReactNode;
  tone?: keyof typeof BAR;
  children?: ReactNode;
}) {
  const heading = useId();
  return (
    <section
      aria-labelledby={heading}
      className="relative overflow-hidden rounded-sheet border border-line bg-surface p-5 shadow-sheet sm:p-7"
    >
      <span
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-1", BAR[tone])}
      />
      <h2
        id={heading}
        className="type-heading text-[1.25rem] sm:text-[1.375rem]"
      >
        {title}
      </h2>
      {lead && <p className="mt-2 max-w-[42rem] text-ink-2">{lead}</p>}
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

/** A quiet row under the main action: "Already sent it? Mark as applied". */
export function AsideRow({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4 text-[0.9375rem]">
      {children}
    </div>
  );
}

export const textButton =
  "inline-flex min-h-9 items-center gap-1.5 rounded-control px-2 font-semibold text-chalk underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-chalk";
