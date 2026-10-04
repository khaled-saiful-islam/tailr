import { Check } from "lucide-react";
import { Segmented } from "@/components/ui/choice";
import { Panel } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import type { PageDraft } from "../draft";

const TEMPLATES: {
  key: PageDraft["template"];
  name: string;
  idea: string;
  suits: string;
}[] = [
  {
    key: "blueprint",
    name: "Blueprint",
    idea: "A technical spec sheet. Your career as a commit graph.",
    suits: "Engineers, data, IT",
  },
  {
    key: "broadsheet",
    name: "Broadsheet",
    idea: "The front page of a quality paper, with you as the story.",
    suits: "Business, consulting, managers",
  },
  {
    key: "salon",
    name: "Salon",
    idea: "A gallery wall. Your work leads; words are the labels.",
    suits: "Designers, creatives, architects",
  },
  {
    key: "poster",
    name: "Poster",
    idea: "Bold and graphic. Leads with what you've achieved.",
    suits: "Graduates, interns, career switchers",
  },
];

interface Props {
  draft: PageDraft;
  update: (recipe: (draft: PageDraft) => PageDraft) => void;
  projectImages: number;
}

/** Template and colours. Each card is drawn in its template's own type and palette. */
export function LookPanel({ draft, update, projectImages }: Props) {
  return (
    <Panel
      title="Look"
      description="Pick a template. Your content stays the same; switch any time."
    >
      <div
        role="radiogroup"
        aria-label="Template"
        className="grid gap-3 sm:grid-cols-2"
      >
        {TEMPLATES.map((template) => {
          const on = draft.template === template.key;
          return (
            <button
              key={template.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => update((d) => ({ ...d, template: template.key }))}
              className={cn(
                "group relative overflow-hidden rounded-panel border text-left transition-[border-color,box-shadow]",
                on
                  ? "border-ink shadow-[0_0_0_2px_var(--ink)]"
                  : "border-line-strong hover:border-ink-3",
              )}
            >
              <div
                data-template={template.key}
                data-mode="light"
                className="flex h-24 items-end justify-between px-4 pb-3"
              >
                <span className="font-pg-display text-[2.5rem] font-bold leading-none [font-stretch:125%]">
                  Aa
                </span>
                <span className="flex gap-1" aria-hidden>
                  <span className="size-3.5 rounded-full bg-pg-accent" />
                  <span className="size-3.5 rounded-full bg-pg-accent-2" />
                  <span className="size-3.5 rounded-full border border-pg-line bg-pg-2" />
                </span>
              </div>
              <div className="border-t border-line bg-surface px-4 py-3">
                <p className="flex items-center gap-1.5 font-semibold">
                  {template.name}
                  {on && <Check className="size-4" aria-hidden />}
                </p>
                <p className="mt-0.5 text-[0.875rem] text-ink-2">
                  {template.idea}
                </p>
                <p className="mt-1 text-[0.8125rem] text-ink-3">
                  {template.suits}
                </p>
                {template.key === "salon" && projectImages < 2 && (
                  <p className="mt-1.5 text-[0.8125rem] font-medium text-fit-stretch">
                    Looks best with pictures for 2 or more projects.
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <p className="type-label">Colours</p>
        <div className="mt-2">
          <Segmented
            label="Colours"
            options={[
              { value: "auto", label: "Match the visitor's device" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            value={draft.appearance}
            onChange={(appearance) => update((d) => ({ ...d, appearance }))}
          />
        </div>
        <p className="mt-2 text-[0.8125rem] text-ink-3">
          Visitors can still switch between light and dark.
        </p>
      </div>
    </Panel>
  );
}
