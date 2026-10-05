import { RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useRegenerateKit, type Kit, type Language, type Tone } from "../api";
import { languageName, rewriteLabel, toneName } from "../options";
import { LanguageChoice, ToneChoice } from "./WritingChoices";

/** A soft band sweeping across the card while Tailr writes. */
function Shimmer() {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--tape)_22%,transparent),transparent)]"
      initial={{ x: "-100%" }}
      animate={{ x: "320%" }}
      transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
    />
  );
}

/**
 * How the application is written: its language and tone, each with a colour and an
 * example. Pick something else and Tailr writes it again; replacing a finished
 * application asks first, because edits are lost.
 */
export function WritingCard({ kit }: { kit: Kit }) {
  const [language, setLanguage] = useState<Language>(kit.language);
  const [tone, setTone] = useState<Tone>(kit.tone);
  const [confirming, setConfirming] = useState(false);
  const regenerate = useRegenerateKit(kit.id);
  const writing = kit.status === "building";
  const failed = kit.status === "failed";
  const changed = language !== kit.language || tone !== kit.tone;
  const label = rewriteLabel(kit, { language, tone });
  const now = `${languageName(kit.language)}, ${toneName(kit.tone).toLowerCase()} tone`;

  const run = () =>
    regenerate.mutate(
      { language, tone },
      {
        onSuccess: () => setConfirming(false),
        onError: (error) => {
          setConfirming(false);
          toast.error(error.message);
        },
      },
    );
  const start = () => (kit.status === "ready" ? setConfirming(true) : run());

  return (
    <section
      aria-labelledby="writing-heading"
      aria-busy={writing}
      className="relative overflow-hidden rounded-sheet border border-line bg-surface p-5 sm:p-6"
    >
      {writing && <Shimmer />}
      <div className="relative flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-[min(100%,18rem)] flex-1">
          <h2 id="writing-heading" className="type-heading">
            How it's written
          </h2>
          <p className="mt-1 text-[0.9375rem] text-ink-2" aria-live="polite">
            {writing ? (
              <>
                Writing it now in <strong className="text-ink">{now}</strong>.
              </>
            ) : (
              <>
                Now: <strong className="text-ink">{now}</strong>. Pick another
                language or tone and Tailr writes it again.
              </>
            )}
          </p>
        </div>
        {kit.status === "ready" && !changed && (
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw className="size-3.5" />}
            onClick={start}
          >
            Write it again
          </Button>
        )}
      </div>

      <div className="relative mt-5 grid gap-5 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <LanguageChoice
          value={language}
          current={kit.language}
          disabled={writing}
          onChange={setLanguage}
        />
        <ToneChoice
          value={tone}
          current={kit.tone}
          disabled={writing}
          onChange={setTone}
        />
      </div>

      <AnimatePresence initial={false}>
        {!writing && (changed || failed) && (
          <motion.div
            key="rewrite"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden"
          >
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-control bg-surface-2 px-4 py-3">
              <p className="min-w-[min(100%,16rem)] flex-1 text-[0.9375rem] text-ink-2">
                {changed
                  ? "Tailr writes a fresh CV, cover letter and answers. Edits you made to this version are replaced."
                  : "The last try didn't finish. Try again with these choices."}
              </p>
              <div className="flex flex-wrap gap-2">
                {changed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setLanguage(kit.language);
                      setTone(kit.tone);
                    }}
                  >
                    Keep it as it is
                  </Button>
                )}
                <Button
                  size="sm"
                  icon={<RefreshCw className="size-3.5" />}
                  loading={regenerate.isPending}
                  onClick={start}
                >
                  {label}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Write this application again?"
        description={`Tailr will write a fresh CV, cover letter and answers in ${languageName(language)}, with a ${toneName(tone).toLowerCase()} tone. Edits you made to this version will be replaced.`}
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Keep this version
          </Button>
          <Button loading={regenerate.isPending} onClick={run}>
            {label}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
