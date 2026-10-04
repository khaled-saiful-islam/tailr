import { Labelled, TextArea } from "@/components/ui/controls";
import { Field } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import type { CoverLetter } from "../api";
import { letterWordCount, setParagraph } from "../edit";

const WORD_LIMIT = 300;

interface LetterEditorProps {
  letter: CoverLetter;
  onChange: (recipe: (letter: CoverLetter) => CoverLetter) => void;
}

/** Edit the cover letter paragraph by paragraph, with a gentle word count. */
export function LetterEditor({ letter, onChange }: LetterEditorProps) {
  const words = letterWordCount(letter);
  return (
    <div className="flex flex-col gap-5">
      <Field
        label="Greeting"
        value={letter.greeting}
        onChange={(event) => {
          const greeting = event.target.value;
          onChange((l) => ({ ...l, greeting }));
        }}
      />
      {(letter.paragraphs ?? []).map((paragraph, index) => (
        <Labelled
          key={index}
          label={`Paragraph ${index + 1}`}
          htmlFor={`kit-paragraph-${index}`}
        >
          <TextArea
            id={`kit-paragraph-${index}`}
            value={paragraph}
            onChange={(event) => {
              const text = event.target.value;
              onChange((l) => setParagraph(l, index, text));
            }}
          />
        </Labelled>
      ))}
      <Field
        label="Closing"
        value={letter.closing}
        onChange={(event) => {
          const closing = event.target.value;
          onChange((l) => ({ ...l, closing }));
        }}
      />
      <p
        className={cn(
          "text-[0.875rem]",
          words > WORD_LIMIT ? "font-medium text-fit-stretch" : "text-ink-3",
        )}
      >
        {words} words.{" "}
        {words > WORD_LIMIT
          ? "Recruiters skim; try to stay under 300."
          : "A length recruiters actually read."}
      </p>
    </div>
  );
}
