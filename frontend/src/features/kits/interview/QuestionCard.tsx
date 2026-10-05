/** One question: tap to open why they ask it, what a strong answer covers, and your story. */
import { ChevronDown, MessageSquareText, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import type { FactRef } from "../api";
import { cn } from "@/lib/cn";
import type { Attempt, Mark } from "./api";
import { overall, scoreLabel, type Card } from "./model";
import { KindTag, MarkButtons, StoryBlock } from "./parts";
import { PracticeBox } from "./PracticeBox";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="type-label text-ink-2">{title}</h4>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Status({ mark, attempt }: { mark?: Mark; attempt?: Attempt }) {
  const score = attempt ? overall(attempt.feedback.scores) : 0;
  return (
    <span className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
      {mark === "confident" && (
        <span className="font-semibold text-fit-strong">Confident</span>
      )}
      {mark === "practice" && (
        <span className="font-semibold text-fit-stretch">Needs practice</span>
      )}
      {attempt && (
        <span className="text-ink-2">Last practice: {scoreLabel(score)}</span>
      )}
    </span>
  );
}

export function QuestionCard({
  kitId,
  card,
  facts,
  mark,
  attempt,
  onMark,
}: {
  kitId: string;
  card: Card;
  facts: FactRef[];
  mark: Mark | undefined;
  attempt: Attempt | undefined;
  onMark: (mark: Mark | null) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [practising, setPractising] = useState(Boolean(attempt));

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn(
        "rounded-panel border bg-surface transition-colors",
        open ? "border-line-strong shadow-sheet" : "border-line",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3 rounded-panel p-4 text-left sm:p-5"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <KindTag kind={card.kind} />
            {card.skill && (
              <span className="text-[0.8125rem] text-ink-3">{card.skill}</span>
            )}
          </span>
          <span className="mt-2 block text-[1.0625rem] font-semibold leading-snug">
            {card.question}
          </span>
          <span className="mt-1.5 block">
            <Status mark={mark} attempt={attempt} />
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-1 size-5 shrink-0 text-ink-3 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-5 border-t border-line px-4 pb-5 pt-4 sm:px-5">
              <Section title="Why they ask">
                <p className="text-ink-2">{card.why}</p>
              </Section>
              {card.strong.length > 0 && (
                <Section title="A strong answer covers">
                  <ul className="flex flex-col gap-1">
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
                </Section>
              )}
              <Section
                title={
                  card.kind === "gap" ? "Bridge from your work" : "Your story"
                }
              >
                <StoryBlock card={card} facts={facts} />
              </Section>
              {card.followUps.length > 0 && (
                <Section title="They may follow up with">
                  <ul className="flex flex-col gap-1 text-ink-2">
                    {card.followUps.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </Section>
              )}
              {card.pitfall && (
                <p className="flex gap-2 rounded-control bg-pin-soft px-3.5 py-2.5 text-[0.9375rem]">
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0 text-pin"
                    aria-hidden
                  />
                  <span>
                    <span className="font-semibold">Avoid: </span>
                    {card.pitfall}
                  </span>
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line pt-4">
                <MarkButtons mark={mark} onMark={onMark} />
                {!practising && (
                  <button
                    type="button"
                    onClick={() => setPractising(true)}
                    className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-chalk hover:underline"
                  >
                    <MessageSquareText className="size-4" aria-hidden />
                    Practise this answer
                  </button>
                )}
              </div>
              {practising && (
                <PracticeBox
                  kitId={kitId}
                  questionId={card.id}
                  attempt={attempt}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
