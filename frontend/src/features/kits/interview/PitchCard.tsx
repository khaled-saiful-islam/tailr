/** "Tell me about yourself": the 60-second answer most interviews open with. */
import { Mic } from "lucide-react";
import { useState } from "react";
import type { FactRef } from "../api";
import type { Attempt, Mark, Plan } from "./api";
import { duration, PITCH_ID } from "./model";
import { MarkButtons, Sources, WithPrompts } from "./parts";
import { PracticeBox } from "./PracticeBox";

export function PitchCard({
  kitId,
  plan,
  facts,
  mark,
  attempt,
  onMark,
}: {
  kitId: string;
  plan: Plan;
  facts: FactRef[];
  mark: Mark | undefined;
  attempt: Attempt | undefined;
  onMark: (mark: Mark | null) => void;
}) {
  const [practising, setPractising] = useState(Boolean(attempt));
  const pitch = plan.pitch;
  if (!pitch.text) return null;
  return (
    <section
      aria-labelledby="pitch-heading"
      className="relative overflow-hidden rounded-sheet border border-line bg-surface p-5 shadow-sheet sm:p-6"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-tape" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[min(100%,16rem)] flex-1">
          <p className="type-label text-ink-2">Most interviews open with</p>
          <h3 id="pitch-heading" className="type-heading mt-1">
            "Tell me about yourself"
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[0.8125rem] font-medium text-ink-2">
          <Mic className="size-3.5" aria-hidden />
          About {duration(pitch.seconds)} to say
        </span>
      </div>
      <p className="mt-4 text-[1.0625rem] leading-relaxed">
        <WithPrompts text={pitch.text} />
      </p>
      <Sources factIds={pitch.fact_ids ?? []} facts={facts} />
      <p className="mt-3 text-[0.875rem] text-ink-2">
        Learn the shape, not the words: who you are now, two proofs that matter
        for this job, and why this role is your next step.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line pt-4">
        <MarkButtons mark={mark} onMark={onMark} />
        {!practising && (
          <button
            type="button"
            onClick={() => setPractising(true)}
            className="text-[0.9375rem] font-semibold text-chalk hover:underline"
          >
            Practise it in your words
          </button>
        )}
      </div>
      {practising && (
        <div className="mt-4">
          <PracticeBox kitId={kitId} questionId={PITCH_ID} attempt={attempt} />
        </div>
      )}
    </section>
  );
}
