/**
 * Practice mode: one question at a time. Say your answer aloud, then show your story and
 * mark how it went. Fully keyboard driven: arrows move, Space or S shows the story,
 * C and P mark it, T starts the two-minute timer.
 */
import { ArrowLeft, ArrowRight, Eye } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { FactRef } from "../api";
import type { Mark } from "./api";
import type { Card } from "./model";
import { KindTag, MarkButtons, StoryBlock } from "./parts";
import { Timer } from "./Timer";
import { useTimer } from "./useTimer";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: Card[];
  facts: FactRef[];
  marks: Partial<Record<string, Mark>>;
  onMark: (id: string, mark: Mark | null) => void;
}

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export function PracticeMode({
  open,
  onOpenChange,
  cards,
  facts,
  marks,
  onMark,
}: Props) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const timer = useTimer(120);
  const card = cards[Math.min(index, cards.length - 1)];

  const go = (step: number) => {
    setIndex((i) => Math.max(0, Math.min(cards.length - 1, i + step)));
    setRevealed(false);
    timer.reset();
  };

  useEffect(() => {
    if (!open || !card) return;
    const onKey = (event: KeyboardEvent) => {
      if (
        typing(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      const onButton = event.target instanceof HTMLButtonElement;
      const key = event.key.toLowerCase();
      if (key === "arrowright") go(1);
      else if (key === "arrowleft") go(-1);
      else if (key === "s" || (key === " " && !onButton)) setRevealed(true);
      else if (key === "c")
        onMark(card.id, marks[card.id] === "confident" ? null : "confident");
      else if (key === "p")
        onMark(card.id, marks[card.id] === "practice" ? null : "practice");
      else if (key === "t") timer.toggle();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!card) return null;
  const last = index === cards.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Practice"
      description="Say your answer out loud first, then check it against your story."
      className="max-w-[46rem]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className="text-[0.875rem] font-medium text-ink-2"
          aria-live="polite"
        >
          Question {index + 1} of {cards.length}
        </p>
        <Timer timer={timer} />
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="h-full rounded-full bg-tape"
          animate={{ width: `${((index + 1) / cards.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={card.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="mt-5"
        >
          <KindTag kind={card.kind} />
          <h3 className="mt-2 text-[1.375rem] font-semibold leading-snug">
            {card.question}
          </h3>
          <p className="mt-1.5 text-ink-2">{card.why}</p>

          <div className="mt-5 [perspective:900px]">
            {revealed ? (
              <motion.div
                initial={{ rotateX: -80, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="origin-top rounded-panel border border-line bg-surface-2/60 p-4"
              >
                {card.strong.length > 0 && (
                  <ul className="mb-4 flex flex-col gap-1 text-[0.9375rem]">
                    {card.strong.map((point) => (
                      <li key={point} className="flex gap-2">
                        <span
                          aria-hidden
                          className="mt-2.5 size-1.5 shrink-0 rounded-full bg-chalk"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <StoryBlock card={card} facts={facts} />
              </motion.div>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setRevealed(true)}
                icon={<Eye className="size-4" aria-hidden />}
                aria-keyshortcuts="S"
              >
                Show my story
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex flex-col gap-4 border-t border-line pt-4">
        <MarkButtons
          keys
          mark={marks[card.id]}
          onMark={(mark) => onMark(card.id, mark)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => go(-1)}
            disabled={index === 0}
            icon={<ArrowLeft className="size-4" aria-hidden />}
            aria-keyshortcuts="ArrowLeft"
          >
            Previous
          </Button>
          {last ? (
            <Button onClick={() => onOpenChange(false)}>Finish</Button>
          ) : (
            <Button
              onClick={() => go(1)}
              aria-keyshortcuts="ArrowRight"
              icon={<ArrowRight className="size-4" aria-hidden />}
            >
              Next question
            </Button>
          )}
        </div>
        <p className="hidden text-[0.8125rem] text-ink-3 sm:block">
          Keys: ← and → move, S shows your story, C confident, P needs practice,
          T starts the timer.
        </p>
      </div>
    </Dialog>
  );
}
