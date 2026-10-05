import { Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { copyText } from "@/lib/clipboard";
import type { KitExtras } from "../api";

/** Ready-to-paste answers for the application form, and a note for the recruiter. */
export function AnswersPanel({ extras }: { extras: KitExtras }) {
  const screening = extras.screening ?? [];
  return (
    <div className="flex max-w-[48rem] flex-col gap-8">
      <section aria-labelledby="screening-heading">
        <h2 id="screening-heading" className="type-heading">
          Application form answers
        </h2>
        <p className="mt-1 text-ink-2">
          Questions forms like this often ask, answered from your profile.
        </p>
        <ul className="mt-5 flex flex-col gap-4">
          {screening.map((item) => (
            <li
              key={item.question}
              className="rounded-panel border border-line bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="min-w-[min(100%,16rem)] flex-1 font-semibold">
                  {item.question}
                </h3>
                <CopyButton text={item.answer} what="Answer" />
              </div>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-2">
                {item.answer}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="recruiter-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[min(100%,16rem)] flex-1">
            <h2 id="recruiter-heading" className="type-heading">
              A note to the recruiter
            </h2>
            <p className="mt-1 text-ink-2">
              Short enough for a LinkedIn message or an email.
            </p>
          </div>
          <CopyButton text={extras.recruiter_message} what="Message" />
        </div>
        <p className="mt-4 whitespace-pre-line rounded-panel border border-line bg-surface p-5 leading-relaxed">
          {extras.recruiter_message}
        </p>
      </section>
    </div>
  );
}

export function CopyButton({ text, what }: { text: string; what: string }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<Copy className="size-3.5" />}
      onClick={() => void copyText(text, what)}
    >
      Copy
    </Button>
  );
}
