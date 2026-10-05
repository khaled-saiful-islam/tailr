import { useDroppable } from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { Application } from "../api";
import { STAGE_HINT, STAGE_LABEL, STAGE_MEANING, type Stage } from "../stages";
import { AppCardBody, cardClass } from "./AppCard";

interface CardsProps {
  ids: string[];
  byId: Map<string, Application>;
  onOpen: (id: string) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

function SortableCard({
  app,
  index,
  onOpen,
}: {
  app: Application;
  index: number;
  onOpen: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onOpen(app.id);
      return;
    }
    listeners?.onKeyDown?.(event);
  };
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
      }}
      className={cn("touch-manipulation", isDragging && "opacity-35")}
    >
      {/* Arriving in a column (on load, or moved here) the card settles into place. */}
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, delay: index * 0.04, ease: EASE }}
        {...attributes}
        {...listeners}
        onKeyDown={keyDown}
        onClick={() => onOpen(app.id)}
        aria-roledescription="application card"
        aria-label={`${app.job.title} at ${app.job.company}, ${STAGE_LABEL[app.stage]}`}
        className={cn(cardClass, "cursor-grab active:cursor-grabbing")}
      >
        <AppCardBody app={app} />
      </motion.div>
    </li>
  );
}

/** One stage of the path: its name, what it means, and its cards. */
export function Column({
  stage,
  ids,
  byId,
  onOpen,
}: CardsProps & { stage: Stage }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${stage}` });
  const heading = `column-${stage}`;
  return (
    <section
      aria-labelledby={heading}
      className={cn(
        "flex min-w-[13.5rem] flex-1 flex-col rounded-panel border bg-surface-2/50 transition-colors duration-200",
        isOver ? "border-chalk/50 bg-chalk-soft/40" : "border-line",
      )}
    >
      <header className="px-3.5 pb-1.5 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 id={heading} className="text-[0.9375rem] font-semibold">
            {STAGE_LABEL[stage]}
          </h3>
          <motion.span
            key={ids.length}
            initial={{ scale: 1.35, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="type-figure grid min-w-6 place-items-center rounded-full bg-surface px-1.5 text-[0.8125rem] text-ink-2"
          >
            {ids.length}
          </motion.span>
        </div>
        <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-3">
          {STAGE_MEANING[stage]}
        </p>
      </header>
      <SortableContext
        id={stage}
        items={ids}
        strategy={verticalListSortingStrategy}
      >
        <ol
          ref={setNodeRef}
          className="flex min-h-28 flex-1 flex-col gap-2 p-2.5"
        >
          {ids.map((id, index) => {
            const app = byId.get(id);
            return app ? (
              <SortableCard key={id} app={app} index={index} onOpen={onOpen} />
            ) : null;
          })}
          {ids.length === 0 && (
            <li className="rounded-control border border-dashed border-line-strong px-3 py-4 text-[0.8125rem] leading-snug text-ink-3">
              {STAGE_HINT[stage]}
            </li>
          )}
        </ol>
      </SortableContext>
    </section>
  );
}

/** "Not successful": a drop zone under the board that opens into a list. */
export function ClosedZone({
  ids,
  byId,
  onOpen,
  dragging,
}: CardsProps & { dragging: boolean }) {
  const [shown, setShown] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: "column:rejected" });
  const open = shown && !dragging;
  return (
    <section
      ref={setNodeRef}
      aria-labelledby="column-rejected"
      className={cn(
        "mt-3 rounded-panel border border-dashed transition-colors",
        isOver
          ? "border-pin/60 bg-pin-soft"
          : dragging
            ? "border-line-strong bg-surface-2/60"
            : "border-line",
      )}
    >
      <button
        type="button"
        onClick={() => setShown((value) => !value)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-left"
      >
        <span className="flex items-baseline gap-2">
          <span id="column-rejected" className="font-semibold">
            {STAGE_LABEL.rejected}
          </span>
          <span className="type-figure text-[0.8125rem] text-ink-3">
            {ids.length}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-[0.875rem] text-ink-2">
          {dragging
            ? "Drop here to close it"
            : ids.length
              ? open
                ? "Hide"
                : "Show"
              : STAGE_HINT.rejected}
          {!dragging && ids.length > 0 && (
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          )}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && ids.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <SortableContext
              id="rejected"
              items={ids}
              strategy={rectSortingStrategy}
            >
              <ol className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-2 px-2.5 pb-2.5">
                {ids.map((id, index) => {
                  const app = byId.get(id);
                  return app ? (
                    <SortableCard
                      key={id}
                      app={app}
                      index={index}
                      onOpen={onOpen}
                    />
                  ) : null;
                })}
              </ol>
            </SortableContext>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
