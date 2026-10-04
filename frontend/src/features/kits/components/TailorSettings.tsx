import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/choice";
import { Dialog } from "@/components/ui/Dialog";
import { useRegenerateKit, type Kit, type Language, type Tone } from "../api";
import { LANGUAGE_OPTIONS, TONE_OPTIONS } from "../options";

/**
 * "Written in English with a confident tone." Pick another language or tone and
 * tailor again. Replacing a finished kit asks first, because edits are lost.
 */
export function TailorSettings({ kit }: { kit: Kit }) {
  const [language, setLanguage] = useState<Language>(kit.language);
  const [tone, setTone] = useState<Tone>(kit.tone);
  const [confirming, setConfirming] = useState(false);
  const regenerate = useRegenerateKit(kit.id);
  const changed = language !== kit.language || tone !== kit.tone;
  const languageName =
    LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ?? "English";

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

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3 rounded-panel border border-line bg-surface px-4 py-3 text-[0.9375rem]">
      <span className="text-ink-2">Written in</span>
      <Segmented
        size="sm"
        label="Language"
        options={LANGUAGE_OPTIONS}
        value={language}
        onChange={setLanguage}
      />
      <span className="text-ink-2">with a</span>
      <Segmented
        size="sm"
        label="Tone"
        options={TONE_OPTIONS}
        value={tone}
        onChange={setTone}
      />
      <span className="text-ink-2">tone.</span>
      <Button
        size="sm"
        variant={changed || kit.status === "failed" ? "primary" : "ghost"}
        icon={<RefreshCw className="size-3.5" />}
        loading={regenerate.isPending}
        onClick={() => (kit.status === "ready" ? setConfirming(true) : run())}
        className="ml-auto"
      >
        Tailor again
      </Button>

      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Tailor this application again?"
        description={`Tailr will write a fresh resume, cover letter and answers in ${languageName}. Edits you made to this version will be replaced.`}
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Keep this version
          </Button>
          <Button loading={regenerate.isPending} onClick={run}>
            Tailor again
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
