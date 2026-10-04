import { Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ChipInput } from "@/components/ui/choice";
import {
  IconButton,
  Labelled,
  Panel,
  TextArea,
} from "@/components/ui/controls";
import { Field } from "@/components/ui/Field";
import {
  useDraftPortfolio,
  type PortfolioContent,
  type PortfolioDraft,
} from "../api";
import type { PortfolioUpdate } from "../draft";

/** What the AI couldn't write because the profile doesn't say. */
function NeedsInput({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-3 rounded-control bg-surface-2 px-3.5 py-2.5 text-[0.875rem]">
      <p className="font-semibold">Tailr needs more from you for:</p>
      <ul className="mt-1 list-disc pl-5 text-ink-2">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-1 text-ink-3">
        Add it to your profile and draft again, or write it yourself.
      </p>
    </div>
  );
}

function DraftButton({
  label,
  pending,
  onClick,
}: {
  label: string;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="secondary"
      icon={<Sparkles className="size-3.5" />}
      loading={pending}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

/** A suggestion to look at before it replaces anything. */
function Suggestion({
  title,
  children,
  onUse,
  onDismiss,
}: {
  title: string;
  children: React.ReactNode;
  onUse: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-5 rounded-panel border border-chalk/40 bg-chalk-soft p-4">
      <p className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-chalk">
        <Sparkles className="size-3.5" aria-hidden /> {title}
      </p>
      <div className="mt-2 text-[0.9375rem]">{children}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={onUse}>
          Use this
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

interface Props {
  portfolio: PortfolioContent;
  update: PortfolioUpdate;
  suggestion: PortfolioDraft | null;
  onSuggestion: (draft: PortfolioDraft | null) => void;
}

/** The hero line, the about story, what you're doing now, and what you like. */
export function StoryPanel({
  portfolio,
  update,
  suggestion,
  onSuggestion,
}: Props) {
  const draft = useDraftPortfolio();
  const about = portfolio.about ?? [];
  const paragraphs = about.length ? about : [""];
  const setAbout = (index: number, text: string) =>
    update((p) => {
      const next = [...(p.about?.length ? p.about : [""])];
      next[index] = text;
      return { ...p, about: next };
    });
  const hasStory = Boolean(suggestion?.hero_line || suggestion?.about.length);

  return (
    <Panel
      title="Your story"
      description="The first line visitors read, and a short about-you in your own voice."
      actions={
        <DraftButton
          label="Draft with AI"
          pending={draft.isPending}
          onClick={() =>
            draft.mutate(["story"], {
              onSuccess: (result) => onSuggestion(result),
              onError: (error) => toast.error(error.message),
            })
          }
        />
      }
    >
      {suggestion && hasStory && (
        <Suggestion
          title="A draft from your profile"
          onDismiss={() => onSuggestion(null)}
          onUse={() => {
            update((p) => ({
              ...p,
              hero_line: suggestion.hero_line ?? p.hero_line,
              about: suggestion.about.length ? suggestion.about : p.about,
            }));
            onSuggestion(null);
          }}
        >
          {suggestion.hero_line && (
            <p className="text-[1.125rem] font-semibold">
              {suggestion.hero_line}
            </p>
          )}
          {suggestion.about.map((paragraph) => (
            <p key={paragraph} className="mt-2 text-ink-2">
              {paragraph}
            </p>
          ))}
        </Suggestion>
      )}
      {suggestion && <NeedsInput items={suggestion.needs_input} />}

      <Field
        label="Your line"
        placeholder="I build AI that bank staff actually use."
        maxLength={90}
        value={portfolio.hero_line ?? ""}
        onChange={(event) => {
          const hero_line = event.target.value || null;
          update((p) => ({ ...p, hero_line }));
        }}
        hint="6 to 10 words: what you do, and for whom."
      />
      <div className="mt-5 flex flex-col gap-3">
        <p className="type-label">About you</p>
        {paragraphs.map((paragraph, index) => (
          <div key={index} className="flex gap-2">
            <TextArea
              aria-label={`About, paragraph ${index + 1}`}
              className="flex-1"
              maxLength={600}
              value={paragraph}
              placeholder={
                index === 0
                  ? "What you do now, and where."
                  : index === 1
                    ? "How you got here: one turning point."
                    : "What you're looking for next."
              }
              onChange={(event) => setAbout(index, event.target.value)}
            />
            {paragraphs.length > 1 && (
              <IconButton
                label={`Remove paragraph ${index + 1}`}
                tone="danger"
                onClick={() =>
                  update((p) => ({
                    ...p,
                    about: (p.about ?? []).filter((_, i) => i !== index),
                  }))
                }
              >
                <Trash2 className="size-4" aria-hidden />
              </IconButton>
            )}
          </div>
        ))}
        {paragraphs.length < 3 && (
          <Button
            size="sm"
            variant="ghost"
            icon={<Plus className="size-3.5" />}
            className="self-start"
            onClick={() =>
              update((p) => ({
                ...p,
                about: [...(p.about?.length ? p.about : [""]), ""],
              }))
            }
          >
            Add a paragraph
          </Button>
        )}
      </div>
      <Field
        className="mt-5"
        label="Currently (optional)"
        placeholder="Building search for 40,000 staff at Selat Pay"
        maxLength={140}
        value={portfolio.currently ?? ""}
        onChange={(event) => {
          const currently = event.target.value || null;
          update((p) => ({ ...p, currently }));
        }}
      />
      <div className="mt-5">
        <ChipInput
          label="Outside work (optional)"
          value={portfolio.interests ?? []}
          onChange={(interests) => update((p) => ({ ...p, interests }))}
          max={8}
          placeholder="Badminton, street food"
          hint="A personal touch. Press Enter after each."
        />
      </div>
    </Panel>
  );
}

/** Three or four areas you're good at, each with the tools you use there. */
export function ExpertisePanel({
  portfolio,
  update,
  suggestion,
  onSuggestion,
}: Props) {
  const draft = useDraftPortfolio();
  const areas = portfolio.expertise ?? [];
  const setArea = (index: number, changes: Partial<(typeof areas)[number]>) =>
    update((p) => ({
      ...p,
      expertise: (p.expertise ?? []).map((area, i) =>
        i === index ? { ...area, ...changes } : area,
      ),
    }));

  return (
    <Panel
      title="What you do"
      description="Three or four areas, each with what you do there and the tools you use."
      actions={
        <DraftButton
          label="Draft with AI"
          pending={draft.isPending}
          onClick={() =>
            draft.mutate(["expertise"], {
              onSuccess: (result) => onSuggestion(result),
              onError: (error) => toast.error(error.message),
            })
          }
        />
      }
    >
      {suggestion && suggestion.expertise.length > 0 && (
        <Suggestion
          title="Areas drafted from your profile"
          onDismiss={() => onSuggestion(null)}
          onUse={() => {
            update((p) => ({ ...p, expertise: suggestion.expertise }));
            onSuggestion(null);
          }}
        >
          <ul className="flex flex-col gap-2">
            {suggestion.expertise.map((area) => (
              <li key={area.title}>
                <span className="font-semibold">{area.title}.</span>{" "}
                <span className="text-ink-2">{area.description}</span>
              </li>
            ))}
          </ul>
        </Suggestion>
      )}
      <div className="flex flex-col gap-4">
        {areas.map((area, index) => (
          <div key={index} className="rounded-control border border-line p-4">
            <div className="flex items-start gap-2">
              <Field
                className="flex-1"
                label={`Area ${index + 1}`}
                maxLength={60}
                value={area.title}
                onChange={(event) =>
                  setArea(index, { title: event.target.value })
                }
              />
              <IconButton
                label={`Remove area ${index + 1}`}
                tone="danger"
                className="mt-7"
                onClick={() =>
                  update((p) => ({
                    ...p,
                    expertise: (p.expertise ?? []).filter(
                      (_, i) => i !== index,
                    ),
                  }))
                }
              >
                <Trash2 className="size-4" aria-hidden />
              </IconButton>
            </div>
            <Labelled
              label="What you do there"
              htmlFor={`area-${index}`}
              className="mt-3"
            >
              <TextArea
                id={`area-${index}`}
                maxLength={260}
                value={area.description ?? ""}
                placeholder="I build assistants that answer from a company's own documents, so staff stop searching."
                onChange={(event) =>
                  setArea(index, { description: event.target.value })
                }
              />
            </Labelled>
            <div className="mt-3">
              <ChipInput
                label="Tools"
                value={area.tools ?? []}
                onChange={(tools) => setArea(index, { tools })}
                max={8}
              />
            </div>
          </div>
        ))}
        {areas.length < 4 && (
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus className="size-3.5" />}
            className="self-start"
            onClick={() =>
              update((p) => ({
                ...p,
                expertise: [
                  ...(p.expertise ?? []),
                  { title: "New area", description: "", tools: [] },
                ],
              }))
            }
          >
            Add an area
          </Button>
        )}
      </div>
    </Panel>
  );
}
