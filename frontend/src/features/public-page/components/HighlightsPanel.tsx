import { Trash2 } from "lucide-react";
import { IconButton, Panel, TextArea } from "@/components/ui/controls";
import type { Highlight } from "../api";
import type { PageDraft } from "../draft";
import type { Slot } from "../useSuggestions";
import { DraftButton, Suggestion, WorkingNote } from "./Suggestion";

type Update = (recipe: (draft: PageDraft) => PageDraft) => void;

/** "By the numbers": achievements from your profile, every number checked. */
export function HighlightsPanel({
  draft,
  update,
  slot,
}: {
  draft: PageDraft;
  update: Update;
  slot: Slot<Highlight[]>;
}) {
  const highlights = draft.settings.highlights ?? [];
  const set = (next: Highlight[]) =>
    update((d) => ({ ...d, settings: { ...d.settings, highlights: next } }));
  const found = slot.value;

  return (
    <Panel
      title="Key numbers"
      description="Up to four results from your profile, shown big. Every number must match a fact you wrote."
      actions={
        <DraftButton
          label={
            highlights.length ? "Suggest again" : "Suggest from my profile"
          }
          runningLabel="Finding numbers…"
          variant={highlights.length ? "secondary" : "primary"}
          running={slot.running}
          onClick={slot.start}
        />
      }
    >
      {slot.running && (
        <WorkingNote
          stage={slot.stage}
          wait="Usually under 20 seconds"
          result="the numbers"
        />
      )}
      {found && (
        <Suggestion
          title="Numbers from your profile"
          useLabel={highlights.length ? "Use these instead" : "Use these"}
          onDismiss={slot.close}
          onUse={() => {
            set(found);
            slot.close();
          }}
        >
          <ul className="flex flex-col gap-1.5">
            {found.map((highlight, index) => (
              <li key={`${highlight.fact_id}-${index}`}>
                <span className="font-bold">{highlight.value}</span>{" "}
                <span className="text-ink-2">{highlight.label}</span>
              </li>
            ))}
          </ul>
        </Suggestion>
      )}
      {highlights.length === 0 ? (
        <p className="text-[0.9375rem] text-ink-2">
          Nothing yet. Tailr picks results with numbers from your profile, like
          "40,000 staff use the assistant I built".
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {highlights.map((highlight, index) => (
            <li
              key={`${highlight.fact_id}-${index}`}
              className="flex items-start gap-3 rounded-control border border-line p-3"
            >
              <span className="min-w-[4.5rem] pt-2 text-[1.25rem] font-bold [font-stretch:115%]">
                {highlight.value}
              </span>
              <label className="min-w-0 flex-1">
                <span className="sr-only">What {highlight.value} is</span>
                {/* Wraps instead of cutting a long label off on a phone; one line of text. */}
                <TextArea
                  rows={1}
                  className="px-3 py-2"
                  value={highlight.label}
                  maxLength={90}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                  onChange={(event) => {
                    const label = event.target.value.replace(/\s*\n\s*/g, " ");
                    set(
                      highlights.map((h, i) =>
                        i === index ? { ...h, label } : h,
                      ),
                    );
                  }}
                />
              </label>
              <IconButton
                label={`Remove ${highlight.value}`}
                tone="danger"
                onClick={() => set(highlights.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
