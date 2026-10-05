/** Type an answer the way you'd say it; get feedback in the background. */
import { MessageSquareText } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/controls";
import { usePractice, type Attempt } from "./api";
import { FeedbackView } from "./FeedbackView";
import { duration } from "./model";

const MIN_WORDS = 12;

const countWords = (text: string) =>
  text.trim() ? text.trim().split(/\s+/).length : 0;

export function PracticeBox({
  kitId,
  questionId,
  attempt,
}: {
  kitId: string;
  questionId: string;
  attempt: Attempt | undefined;
}) {
  const id = useId();
  const practice = usePractice(kitId, questionId);
  const [answer, setAnswer] = useState(attempt?.answer ?? "");
  const words = countWords(answer);

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (words >= MIN_WORDS && !practice.running) practice.send(answer);
        }}
      >
        <label htmlFor={id} className="font-semibold">
          Your answer, the way you'd say it
        </label>
        <p className="mt-0.5 text-[0.875rem] text-ink-2">
          Write it as you'd speak. Tailr scores it and shows a tighter version,
          using only what you wrote and your profile.
        </p>
        <TextArea
          id={id}
          className="mt-2 min-h-28"
          rows={4}
          value={answer}
          maxLength={4000}
          onChange={(event) => setAnswer(event.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.8125rem] text-ink-3" aria-live="polite">
            {words === 0
              ? "A few sentences is enough to start."
              : `${words} words, about ${duration(words / 2.5)} to say.`}
          </p>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            loading={practice.running}
            disabled={words < MIN_WORDS}
            icon={<MessageSquareText className="size-4" aria-hidden />}
          >
            {practice.running ? "Checking your answer…" : "Get feedback"}
          </Button>
        </div>
        {practice.running && (
          <p className="mt-2 text-[0.875rem] text-ink-2" aria-live="polite">
            {practice.stage ?? "Reading your answer"}. About 15 seconds; you can
            keep going.
          </p>
        )}
        {practice.error && (
          <p role="alert" className="mt-2 text-[0.875rem] text-pin">
            {practice.error}
          </p>
        )}
      </form>
      {attempt && !practice.running && <FeedbackView attempt={attempt} />}
    </div>
  );
}
