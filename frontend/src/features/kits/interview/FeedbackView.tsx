/** Feedback on a practice answer: four scores, what worked, what to change, a tighter version. */
import { ArrowRight, Check, Copy, Info } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";
import type { Attempt } from "./api";
import { duration, scoreLabel } from "./model";

const SCORES: { key: keyof Attempt["feedback"]["scores"]; label: string }[] = [
  { key: "structure", label: "Clear story" },
  { key: "specificity", label: "Specific" },
  { key: "relevance", label: "On point" },
  { key: "length", label: "Length" },
];

function tone(score: number): string {
  if (score >= 4) return "bg-fit-strong";
  if (score === 3) return "bg-fit-good";
  return "bg-fit-stretch";
}

function Meter({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[0.875rem]">
        <span className="font-medium">{label}</span>
        <span className="text-ink-2">{scoreLabel(score)}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={score}
        aria-valuetext={`${scoreLabel(score)}, ${score} of 5`}
        className="mt-1.5 grid grid-cols-5 gap-1"
      >
        {[1, 2, 3, 4, 5].map((step) => (
          <motion.span
            key={step}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: step * 0.06, duration: 0.25 }}
            className={cn(
              "h-1.5 origin-left rounded-full",
              step <= score ? tone(score) : "bg-surface-3",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function List({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: "check" | "arrow" | "info";
}) {
  if (!items.length) return null;
  const Icon = icon === "check" ? Check : icon === "arrow" ? ArrowRight : Info;
  const color =
    icon === "check"
      ? "text-fit-strong"
      : icon === "arrow"
        ? "text-chalk"
        : "text-fit-stretch";
  return (
    <div>
      <h5 className="type-label text-ink-2">{title}</h5>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 leading-relaxed">
            <Icon className={cn("mt-1 size-4 shrink-0", color)} aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "[how you found the cause]": a detail only you can add, highlighted so it's not missed. */
function WithPrompts({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\])/).map((part, index) =>
        part.startsWith("[") && part.endsWith("]") ? (
          <mark
            key={index}
            className="rounded-[4px] bg-[color-mix(in_oklab,var(--tape)_35%,transparent)] px-1 text-ink"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function FeedbackView({ attempt }: { attempt: Attempt }) {
  const feedback = attempt.feedback;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 rounded-panel border border-line bg-surface-2/60 p-4 sm:p-5"
      aria-live="polite"
    >
      <div>
        <h4 className="font-semibold">{feedback.verdict}</h4>
        <p className="mt-1 text-[0.875rem] text-ink-2">
          Your answer: {attempt.words} words, about {duration(attempt.seconds)}{" "}
          to say. One to two minutes is about right.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {SCORES.map((s) => (
          <Meter key={s.key} label={s.label} score={feedback.scores[s.key]} />
        ))}
      </div>
      <List title="What worked" items={feedback.worked ?? []} icon="check" />
      <List
        title="Make it stronger"
        items={feedback.improve ?? []}
        icon="arrow"
      />
      {feedback.better_answer && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h5 className="type-label text-ink-2">A tighter version</h5>
            <Button
              variant="ghost"
              size="sm"
              icon={<Copy className="size-3.5" aria-hidden />}
              onClick={() => void copyText(feedback.better_answer, "Answer")}
            >
              Copy
            </Button>
          </div>
          <p className="mt-2 rounded-control border border-line bg-surface p-3.5 leading-relaxed">
            <WithPrompts text={feedback.better_answer} />
          </p>
          <p className="mt-1.5 text-[0.8125rem] text-ink-3">
            Built only from what you wrote and your profile. Fill in the
            highlighted parts with your own details, then say it in your own
            words.
          </p>
        </div>
      )}
      <List
        title="Be ready to back these up"
        items={feedback.unsupported ?? []}
        icon="info"
      />
    </motion.div>
  );
}
