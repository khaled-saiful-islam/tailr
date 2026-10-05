/** The call to build the full interview plan, and its progress while it's written. */
import { Check, RefreshCw, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";

interface Builder {
  build: () => void;
  running: boolean;
  stage: string | null;
  error: string | null;
}

const INCLUDED = [
  "About 15 questions in five kinds, each with what a strong answer covers",
  "Your best story for each, built only from your profile",
  "Honest answers for the must-have skills you don't have yet",
  'A 60-second "Tell me about yourself", questions to ask them and a checklist for the day',
];

function Working({ stage }: { stage: string | null }) {
  return (
    <div className="mt-4" aria-live="polite">
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="h-full w-1/3 rounded-full bg-chalk"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <p className="mt-2 font-medium">{stage ?? "Starting"}…</p>
      <p className="text-[0.875rem] text-ink-2">
        About a minute. You can keep working; Tailr tells you when it's ready.
      </p>
    </div>
  );
}

export function BuildPlan({
  builder,
  ready,
}: {
  builder: Builder;
  ready: boolean;
}) {
  return (
    <section
      aria-labelledby="build-plan-heading"
      className="rounded-sheet border border-chalk/30 bg-chalk-soft/50 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-chalk text-surface">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="build-plan-heading" className="type-heading">
            Get ready properly: build your full interview plan
          </h3>
          <p className="mt-1 text-ink-2">
            The questions below are a start. A full plan prepares you for what
            this interviewer will really ask.
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {INCLUDED.map((item) => (
          <li key={item} className="flex gap-2 text-[0.9375rem]">
            <Check className="mt-1 size-4 shrink-0 text-chalk" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {builder.running ? (
        <Working stage={builder.stage} />
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            onClick={builder.build}
            disabled={!ready}
            icon={<Sparkles className="size-4" aria-hidden />}
          >
            Build my full plan
          </Button>
          {!ready && (
            <span className="text-[0.875rem] text-ink-2">
              Available when your application is ready.
            </span>
          )}
        </div>
      )}
      {builder.error && (
        <p role="alert" className="mt-3 text-[0.875rem] text-pin">
          {builder.error}
        </p>
      )}
    </section>
  );
}

/** A quiet way to write the plan again (after you've improved your profile, say). */
export function BuildAgain({ builder }: { builder: Builder }) {
  if (builder.running) return <Working stage={builder.stage} />;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem] text-ink-2">
      <span>Changed your profile since? Your marks and practice stay.</span>
      <button
        type="button"
        onClick={builder.build}
        className="inline-flex items-center gap-1.5 font-semibold text-chalk hover:underline"
      >
        <RefreshCw className="size-3.5" aria-hidden />
        Write the plan again
      </button>
      {builder.error && (
        <span role="alert" className="w-full text-pin">
          {builder.error}
        </span>
      )}
    </div>
  );
}
