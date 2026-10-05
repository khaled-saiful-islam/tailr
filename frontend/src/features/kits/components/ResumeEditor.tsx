import { Quote, Trash2 } from "lucide-react";
import { ChipInput } from "@/components/ui/choice";
import { IconButton, Labelled, TextArea } from "@/components/ui/controls";
import type {
  FactRef,
  SectionRef,
  TailoredBullet,
  TailoredResume,
} from "../api";
import { removeBullet, setBullet, sourcesFor, type SectionKey } from "../edit";
import { OneLineField } from "./OneLineField";

interface ResumeEditorProps {
  resume: TailoredResume;
  onChange: (recipe: (resume: TailoredResume) => TailoredResume) => void;
  facts: FactRef[];
  sections: SectionRef[];
}

/** Edit the tailored resume. Each line shows the profile facts it was written from. */
export function ResumeEditor({
  resume,
  onChange,
  facts,
  sections,
}: ResumeEditorProps) {
  const labels = new Map(sections.map((s) => [s.id, s.label]));
  const blocks: {
    key: SectionKey;
    label: string;
    bullets: TailoredBullet[];
  }[] = [
    ...(resume.roles ?? []).map((role) => ({
      key: { kind: "role" as const, id: role.experience_id },
      label: labels.get(role.experience_id) ?? "Role",
      bullets: role.bullets ?? [],
    })),
    ...(resume.projects ?? []).map((project) => ({
      key: { kind: "project" as const, id: project.project_id },
      label: `Project: ${labels.get(project.project_id) ?? "Untitled"}`,
      bullets: project.bullets ?? [],
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <OneLineField
        id="kit-headline"
        label="Headline"
        value={resume.headline}
        onChange={(headline) => onChange((r) => ({ ...r, headline }))}
      />
      <Labelled label="Summary" htmlFor="kit-summary">
        <TextArea
          id="kit-summary"
          value={resume.summary}
          onChange={(event) => {
            const summary = event.target.value;
            onChange((r) => ({ ...r, summary }));
          }}
        />
      </Labelled>

      {blocks.map((block) => (
        <section
          key={block.key.id}
          aria-label={block.label}
          className="flex flex-col gap-3"
        >
          <h3 className="type-label">{block.label}</h3>
          {block.bullets.length === 0 && (
            <p className="text-[0.875rem] text-ink-3">
              No lines for this one. It still appears on your resume.
            </p>
          )}
          {block.bullets.map((bullet, index) => (
            <BulletEditor
              key={index}
              bullet={bullet}
              sources={sourcesFor(bullet.fact_ids, facts)}
              label={`${block.label}, line ${index + 1}`}
              onText={(text) =>
                onChange((r) => setBullet(r, block.key, index, text))
              }
              onRemove={() =>
                onChange((r) => removeBullet(r, block.key, index))
              }
            />
          ))}
        </section>
      ))}

      <ChipInput
        label="Skills"
        value={resume.skills ?? []}
        onChange={(skills) => onChange((r) => ({ ...r, skills }))}
        max={30}
        hint="Ordered for this job. Remove what doesn't help; press Enter to add."
      />
    </div>
  );
}

function BulletEditor({
  bullet,
  sources,
  label,
  onText,
  onRemove,
}: {
  bullet: TailoredBullet;
  sources: FactRef[];
  label: string;
  onText: (text: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex gap-2">
      <div className="min-w-0 flex-1">
        <TextArea
          aria-label={label}
          value={bullet.text}
          onChange={(event) => onText(event.target.value)}
        />
        {sources.length > 0 && (
          <div className="mt-1.5 flex gap-1.5 px-1 text-[0.8125rem] text-ink-3">
            <Quote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <p>
              <span className="sr-only">Written from your profile: </span>
              {sources.map((source) => source.text).join(" / ")}
            </p>
          </div>
        )}
      </div>
      <IconButton
        label={`Remove ${label}`}
        tone="danger"
        onClick={onRemove}
        className="mt-1"
      >
        <Trash2 className="size-4" aria-hidden />
      </IconButton>
    </div>
  );
}
