/**
 * Interview prep for one application. Five likely questions come with the application; the
 * full plan (built on request, in the background) adds a pitch, about fifteen questions in
 * five kinds, honest answers for missing skills, questions to ask and a checklist. Every
 * answer can be practised with feedback, and marked "confident" or "needs practice".
 */
import { Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { FactRef, KitExtras } from "../api";
import { useInterviewPrep, useMark, usePlanBuilder, type Mark } from "./api";
import { AskThem } from "./AskThem";
import { BuildAgain, BuildPlan } from "./BuildPlan";
import {
  cardsFromExtras,
  cardsOf,
  countKinds,
  KINDS,
  PITCH_ID,
  readiness,
  visible,
  type Card,
  type Filter,
} from "./model";
import { PitchCard } from "./PitchCard";
import { PracticeMode } from "./PracticeMode";
import { QuestionCard } from "./QuestionCard";

function Readiness({ confident, total, share }: ReturnType<typeof readiness>) {
  return (
    <div className="min-w-[min(100%,15rem)] flex-1">
      <div className="flex items-baseline justify-between gap-3 text-[0.9375rem]">
        <span className="font-semibold">
          Ready for {confident} of {total}
        </span>
        <span className="text-ink-2">{share}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Questions you're confident about"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={confident}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-3"
      >
        <motion.div
          className="h-full rounded-full bg-fit-strong"
          initial={false}
          animate={{ width: `${share}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

function Filters({
  filter,
  onChange,
  counts,
  todo,
  total,
}: {
  filter: Filter;
  onChange: (filter: Filter) => void;
  counts: Record<string, number>;
  todo: number;
  total: number;
}) {
  const options: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: total },
    { key: "todo", label: "Not confident yet", count: todo },
    ...KINDS.filter((k) => counts[k.key]).map((k) => ({
      key: k.key as Filter,
      label: k.label,
      count: counts[k.key] ?? 0,
    })),
  ];
  return (
    <div
      role="group"
      aria-label="Show questions"
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const on = filter === option.key;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.key)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.875rem] font-medium transition-colors",
              on
                ? "border-primary bg-primary text-primary-ink"
                : "border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink",
            )}
          >
            {option.label}
            <span
              className={cn("tabular-nums", on ? "opacity-80" : "text-ink-3")}
            >
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function InterviewPrep({
  kitId,
  extras,
  facts,
}: {
  kitId: string;
  extras: KitExtras;
  facts: FactRef[];
}) {
  const prep = useInterviewPrep(kitId);
  const builder = usePlanBuilder(kitId);
  const marker = useMark(kitId);
  const [filter, setFilter] = useState<Filter>("all");
  // The questions of one practice session, fixed when it starts (marks mustn't reshuffle it).
  const [session, setSession] = useState<{ id: number; cards: Card[] } | null>(
    null,
  );

  const data = prep.data;
  const plan = data?.plan ?? null;
  const cards = data ? cardsOf(data) : cardsFromExtras(extras);
  const marks = data?.marks ?? {};
  const practice = data?.practice ?? {};
  const kindDescription = KINDS.find((k) => k.key === filter)?.hint;
  const shown = visible(cards, filter, marks);
  const ready = readiness(
    [...(plan ? [PITCH_ID] : []), ...cards.map((c) => c.id)],
    marks,
  );
  const mark = (id: string, value: Mark | null) =>
    marker.mutate({ question_id: id, mark: value });

  return (
    <section
      aria-labelledby="interview-heading"
      className="flex max-w-[52rem] flex-col gap-6"
    >
      <header className="flex flex-col gap-4">
        <div>
          <h2 id="interview-heading" className="type-heading">
            Interview prep
          </h2>
          <p className="mt-1 text-ink-2">
            {plan
              ? `${cards.length} questions this interviewer is likely to ask, each with your best story from your profile. Mark each one when you're confident.`
              : `${cards.length === 1 ? "A question" : `${cards.length} questions`} they'll probably ask, and the story from your profile that answers ${cards.length === 1 ? "it" : "each"}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-panel border border-line bg-surface p-4">
          <Readiness {...ready} />
          <Button
            variant="tape"
            onClick={() => setSession({ id: Date.now(), cards: shown })}
            disabled={!data || shown.length === 0}
            icon={<Play className="size-4" aria-hidden />}
          >
            Practise {filter === "all" ? "all" : "these"}
          </Button>
        </div>
      </header>

      {!plan && data && <BuildPlan builder={builder} ready={data.ready} />}
      {plan && (
        <PitchCard
          kitId={kitId}
          plan={plan}
          facts={facts}
          mark={marks[PITCH_ID]}
          attempt={practice[PITCH_ID]}
          onMark={(value) => mark(PITCH_ID, value)}
        />
      )}

      {plan && (
        <div className="flex flex-col gap-2">
          <Filters
            filter={filter}
            onChange={setFilter}
            counts={countKinds(cards)}
            todo={visible(cards, "todo", marks).length}
            total={cards.length}
          />
          {kindDescription && (
            <p className="text-[0.9375rem] text-ink-2">{kindDescription}</p>
          )}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((card) => (
            <QuestionCard
              key={card.id}
              kitId={kitId}
              card={card}
              facts={facts}
              mark={marks[card.id]}
              attempt={practice[card.id]}
              onMark={(value) => mark(card.id, value)}
            />
          ))}
        </AnimatePresence>
      </ul>
      {shown.length === 0 && (
        <p className="rounded-panel border border-dashed border-line-strong p-5 text-center text-ink-2">
          You're confident about every question here. Practise them once more
          the day before.
        </p>
      )}

      {plan && <AskThem kitId={kitId} plan={plan} />}
      {plan && (plan.stories_removed ?? 0) > 0 && (
        <p className="text-[0.875rem] text-ink-3">
          Tailr left out {plan.stories_removed}{" "}
          {plan.stories_removed === 1 ? "story" : "stories"} that claimed more
          than your profile says.
        </p>
      )}
      {plan && <BuildAgain builder={builder} />}

      <PracticeMode
        key={session?.id ?? 0}
        open={session !== null}
        onOpenChange={(open) => !open && setSession(null)}
        cards={session?.cards ?? []}
        facts={facts}
        marks={marks}
        onMark={mark}
      />
    </section>
  );
}
