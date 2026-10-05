import {
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  Coffee,
  Mail,
  MessageCircleQuestion,
  Send,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { cn } from "@/lib/cn";
import type { Application } from "../api";
import { needsYou, type NeedKind } from "../next";

const SHOWN = 4;

const KIND: Record<NeedKind, { icon: LucideIcon; className: string }> = {
  soon: { icon: CalendarClock, className: "bg-tape text-tape-ink" },
  follow_up: { icon: Mail, className: "bg-chalk-soft text-chalk" },
  send: {
    icon: Send,
    className:
      "bg-[color-mix(in_oklab,var(--fit-strong)_16%,transparent)] text-fit-strong",
  },
  outcome: {
    icon: MessageCircleQuestion,
    className: "bg-chalk-soft text-chalk",
  },
  date: { icon: CalendarPlus, className: "bg-surface-2 text-ink-2" },
};

function Calm({ waiting }: { waiting: number }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2">
        <Coffee className="size-5" aria-hidden />
      </span>
      <p className="pt-2 text-ink-2">
        Nothing needs you right now.{" "}
        {waiting > 0
          ? `${waiting === 1 ? "1 saved job is" : `${waiting} saved jobs are`} waiting: open one to prepare an application.`
          : "Save a job you like from your Jobs page and it lands here."}
      </p>
    </div>
  );
}

/** The top of the page: what to do today, most urgent first. */
export function NeedsYou({ items }: { items: Application[] }) {
  const needs = needsYou(items);
  const waiting = items.filter(
    (app) => app.stage === "saved" && !app.kit_status,
  ).length;
  const more = needs.length - SHOWN;

  return (
    <section
      aria-labelledby="needs-heading"
      className="rounded-sheet border border-line bg-surface p-5 shadow-sheet sm:p-6"
    >
      <h2 id="needs-heading" className="type-heading flex items-center gap-2.5">
        {needs.length > 0 && (
          <span className="relative grid size-2.5 place-items-center">
            <span className="absolute inset-0 rounded-full bg-tape motion-safe:animate-ping" />
            <span className="relative size-2.5 rounded-full bg-tape" />
          </span>
        )}
        Needs you now
      </h2>
      {needs.length === 0 ? (
        <div className="mt-4">
          <Calm waiting={waiting} />
        </div>
      ) : (
        <ul className="mt-3 flex flex-col">
          {needs.slice(0, SHOWN).map((need, index) => {
            const { icon: Icon, className } = KIND[need.kind];
            return (
              <motion.li
                key={`${need.kind}-${need.app.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.08 + index * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="border-b border-line last:border-b-0"
              >
                <Link
                  to={`/applications/${need.app.id}`}
                  className="group -mx-2 flex items-center gap-3 rounded-control px-2 py-3 transition-colors hover:bg-surface-2"
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full",
                      className,
                    )}
                  >
                    <Icon className="size-[1.125rem]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-snug">
                      {need.title}
                    </span>
                    <span className="mt-0.5 block text-[0.875rem] leading-snug text-ink-2">
                      {need.detail}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                    aria-hidden
                  />
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
      {more > 0 && (
        <p className="mt-2 text-[0.875rem] text-ink-3">
          And {more} more on the board below.
        </p>
      )}
    </section>
  );
}
