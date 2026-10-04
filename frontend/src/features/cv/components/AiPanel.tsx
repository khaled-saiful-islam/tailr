import {
  Languages,
  ListChecks,
  RotateCcw,
  ScrollText,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Panel, TextArea } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { useCvAi, useUndoCv, type Cv } from "../api";

const ACTIONS = [
  {
    action: "polish",
    icon: Sparkles,
    title: "Polish every line",
    detail: "Strong verbs, results first, no filler.",
  },
  {
    action: "one_page",
    icon: ListChecks,
    title: "Fit on one page",
    detail: "Keeps your strongest lines and tightens the rest.",
  },
  {
    action: "summary",
    icon: ScrollText,
    title: "New headline and summary",
    detail: "Two or three specific sentences.",
  },
] as const;

/**
 * AI edits run in the background (a few seconds) and are checked against your
 * profile. The last change can always be undone.
 */
export function AiPanel({
  cv,
  busy,
  onChanged,
}: {
  cv: Cv;
  busy: boolean;
  onChanged: () => void;
}) {
  const ai = useCvAi();
  const undo = useUndoCv();
  const [instruction, setInstruction] = useState("");
  const working = cv.status === "working" || ai.isPending;
  const language = cv.options.language ?? "en";
  const otherLanguage = language === "en" ? "ms" : "en";

  const run = (body: Parameters<typeof ai.mutate>[0]) =>
    ai.mutate(body, {
      onSuccess: () => {
        onChanged();
        toast("Editing your CV", {
          description: "Tailr will let you know when it's done.",
        });
      },
      onError: (error) => toast.error(error.message),
    });

  const check = cv.last_check;
  const corrected = (check?.issues ?? []).length;

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Improve with AI"
        description="Tailr rewrites your CV using only what's in your profile, then checks every line against it. Anything that goes too far goes back to your own words."
      >
        {busy && !working && (
          <p className="mb-4 rounded-control bg-surface-2 px-3.5 py-2.5 text-[0.875rem] text-ink-2">
            Saving your edits first.
          </p>
        )}
        <div className="grid gap-3">
          {ACTIONS.map((item) => (
            <button
              key={item.action}
              type="button"
              disabled={working || busy}
              onClick={() => run({ action: item.action })}
              className="flex items-start gap-3 rounded-panel border border-line-strong bg-surface p-4 text-left transition-colors hover:border-ink-3 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--tape)_25%,transparent)]">
                <item.icon className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{item.title}</span>
                <span className="block text-[0.875rem] text-ink-2">
                  {item.detail}
                </span>
              </span>
            </button>
          ))}
          <button
            type="button"
            disabled={working || busy}
            onClick={() =>
              run({ action: "translate", language: otherLanguage })
            }
            className="flex items-start gap-3 rounded-panel border border-line-strong bg-surface p-4 text-left transition-colors hover:border-ink-3 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--chalk)_20%,transparent)]">
              <Languages className="size-4" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold">
                {otherLanguage === "ms"
                  ? "Translate to Bahasa Malaysia"
                  : "Translate to English"}
              </span>
              <span className="block text-[0.875rem] text-ink-2">
                Names, tools and numbers stay exactly as they are.
              </span>
            </span>
          </button>
        </div>

        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (instruction.trim())
              run({ action: "custom", instruction: instruction.trim() });
          }}
        >
          <label htmlFor="cv-instruction" className="type-label">
            Or say what you want
          </label>
          <TextArea
            id="cv-instruction"
            className="mt-1.5"
            maxLength={300}
            placeholder="Emphasise leadership and mentoring. Aim at product manager roles."
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
          />
          <div className="mt-2 flex justify-end">
            <Button
              type="submit"
              icon={<Wand2 className="size-4" />}
              disabled={!instruction.trim() || working || busy}
              loading={ai.isPending}
            >
              Apply
            </Button>
          </div>
        </form>
      </Panel>

      {(working || cv.last_action || cv.error) && (
        <Panel
          title="Last change"
          description={
            working
              ? "The AI is editing your CV. It takes a few seconds."
              : undefined
          }
        >
          {working ? (
            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-3"
              role="progressbar"
              aria-label="Editing"
            >
              <div className="h-full w-1/3 animate-[cv-slide_1.2s_ease-in-out_infinite] rounded-full bg-tape" />
            </div>
          ) : (
            <>
              {cv.error ? (
                <p className="text-pin">{cv.error}</p>
              ) : (
                <p className="font-semibold">{cv.last_action}</p>
              )}
              {check && (
                <p className={cn("mt-1.5 text-[0.9375rem] text-ink-2")}>
                  {check.lines_checked} lines checked against your profile.{" "}
                  {corrected === 0
                    ? "Nothing was added that isn't yours."
                    : `${corrected} ${corrected === 1 ? "line was" : "lines were"} put back to your own words.`}
                  {(check.skills_removed ?? []).length > 0 &&
                    ` ${(check.skills_removed ?? []).length} skills not in your profile were left out.`}
                </p>
              )}
              {cv.can_undo && (
                <Button
                  className="mt-4"
                  size="sm"
                  variant="secondary"
                  icon={<RotateCcw className="size-3.5" />}
                  loading={undo.isPending}
                  disabled={busy}
                  onClick={() =>
                    undo.mutate(cv.version, {
                      onSuccess: () => {
                        onChanged();
                        toast.success("Undone");
                      },
                      onError: (error) => toast.error(error.message),
                    })
                  }
                >
                  Undo this change
                </Button>
              )}
            </>
          )}
        </Panel>
      )}
    </div>
  );
}
