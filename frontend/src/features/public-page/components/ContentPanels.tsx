import { Star, Trash2 } from "lucide-react";
import { IconButton, Panel, Switch } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import type { PageProject, Section } from "@/public/types";
import {
  imageUrl,
  type CaseStudy,
  type ImageOut,
  type PortfolioDraft,
} from "../api";
import { portfolioOf, portfolioUpdater, type PageDraft } from "../draft";
import type { Slot } from "../useSuggestions";
import { CaseStudyEditor } from "./CaseStudyEditor";
import { ImagePicker } from "./ImagePicker";
import { CaseDraft, DraftButton, NeedsInput, WorkingNote } from "./Suggestion";

type Update = (recipe: (draft: PageDraft) => PageDraft) => void;

/** A picture for each project, and which one leads. */
export function ProjectsPanel({
  draft,
  update,
  projects,
  onImage,
  slot,
}: {
  draft: PageDraft;
  update: Update;
  projects: PageProject[];
  onImage: (image: ImageOut) => void;
  slot: Slot<PortfolioDraft>;
}) {
  const settings = draft.settings;
  const images = settings.project_images ?? {};
  const setImage = (projectId: string, imageId: string | null) =>
    update((d) => {
      const next = { ...(d.settings.project_images ?? {}) };
      if (imageId) next[projectId] = imageId;
      else delete next[projectId];
      return { ...d, settings: { ...d.settings, project_images: next } };
    });

  const cases = portfolioOf(draft).case_studies ?? {};
  const suggestion = slot.value;
  const suggested = suggestion?.case_studies ?? {};
  const setCase = (projectId: string, study: CaseStudy | null) =>
    portfolioUpdater(update)((p) => {
      const next = { ...(p.case_studies ?? {}) };
      if (study) next[projectId] = study;
      else delete next[projectId];
      return { ...p, case_studies: next };
    });
  /** One drafted case study used or skipped; put the draft away when none are left. */
  const settleDraft = (projectId: string) => {
    if (!suggestion) return;
    const rest = Object.fromEntries(
      Object.entries(suggestion.case_studies).filter(
        ([id]) => id !== projectId,
      ),
    );
    const waiting = projects.some(
      (project) => cases[project.id] === undefined && rest[project.id],
    );
    if (waiting || suggestion.needs_input.length)
      slot.replace({ ...suggestion, case_studies: rest });
    else slot.close();
  };
  const hasDrafts = projects.some(
    (project) => cases[project.id] === undefined && suggested[project.id],
  );

  if (!projects.length) {
    return (
      <Panel
        title="Projects"
        description="Add projects to your profile to show them here with pictures."
      >
        <p className="text-[0.9375rem] text-ink-2">
          No projects in your profile yet.
        </p>
      </Panel>
    );
  }
  return (
    <Panel
      title="Projects"
      description="Each project gets its own page. Add a cover picture, choose one to lead, and tell the story as a case study."
      actions={
        <DraftButton
          label="Draft case studies with AI"
          running={slot.running}
          onClick={slot.start}
        />
      }
    >
      {slot.running && (
        <WorkingNote stage={slot.stage} result="your case studies" />
      )}
      {suggestion && (
        <NeedsInput
          items={suggestion.needs_input}
          onClose={
            hasDrafts
              ? () => slot.replace({ ...suggestion, needs_input: [] })
              : slot.close
          }
        />
      )}
      <ul className="flex flex-col gap-3">
        {projects.map((project) => {
          const imageId = images[project.id];
          const featured = settings.featured_project_id === project.id;
          return (
            <li
              key={project.id}
              className="flex flex-wrap items-center gap-3 rounded-control border border-line p-3"
            >
              {imageId ? (
                <img
                  src={imageUrl(imageId) ?? undefined}
                  alt=""
                  className="h-14 w-[5.5rem] rounded-[6px] border border-line object-cover"
                />
              ) : (
                <span className="grid h-14 w-[5.5rem] place-items-center rounded-[6px] bg-surface-2 text-[0.75rem] text-ink-3">
                  No picture
                </span>
              )}
              <div className="min-w-[min(100%,10rem)] flex-1">
                <p className="font-semibold">{project.name}</p>
                <button
                  type="button"
                  aria-pressed={featured}
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      settings: {
                        ...d.settings,
                        featured_project_id: featured ? null : project.id,
                      },
                    }))
                  }
                  className={cn(
                    "mt-1 inline-flex items-center gap-1 text-[0.8125rem] font-semibold",
                    featured ? "text-fit-stretch" : "text-ink-3 hover:text-ink",
                  )}
                >
                  <Star
                    className={cn("size-3.5", featured && "fill-current")}
                    aria-hidden
                  />
                  {featured ? "Leads your projects" : "Make it lead"}
                </button>
              </div>
              <div className="flex gap-1">
                <ImagePicker
                  purpose="project"
                  label={imageId ? "Replace" : "Add picture"}
                  onUploaded={(image) => {
                    onImage(image);
                    setImage(project.id, image.id);
                  }}
                />
                {imageId && (
                  <IconButton
                    label={`Remove the picture for ${project.name}`}
                    tone="danger"
                    onClick={() => setImage(project.id, null)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </IconButton>
                )}
              </div>
              {cases[project.id] === undefined && suggested[project.id] && (
                <CaseDraft
                  study={suggested[project.id]!}
                  onUse={() => {
                    setCase(project.id, suggested[project.id] ?? null);
                    settleDraft(project.id);
                  }}
                  onSkip={() => settleDraft(project.id)}
                />
              )}
              <CaseStudyEditor
                name={project.id}
                study={cases[project.id]}
                onChange={(study) => setCase(project.id, study)}
                onImage={onImage}
              />
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

const SECTIONS: { key: Section; label: string }[] = [
  { key: "about", label: "About" },
  { key: "expertise", label: "What you do" },
  { key: "achievements", label: "Achievements" },
  { key: "testimonials", label: "What people say" },
  { key: "contact", label: "Contact" },
  { key: "highlights", label: "Key numbers" },
  { key: "projects", label: "Projects" },
  { key: "experience", label: "Experience" },
  { key: "skills", label: "Skills" },
  { key: "education", label: "Education" },
  { key: "certifications", label: "Certifications" },
  { key: "languages", label: "Languages" },
];

export function SectionsPanel({
  draft,
  update,
}: {
  draft: PageDraft;
  update: Update;
}) {
  const hidden = draft.settings.hidden_sections ?? [];
  return (
    <Panel
      title="Sections"
      description="Hide anything you'd rather not show. Empty sections hide themselves."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Switch
            key={section.key}
            label={section.label}
            checked={!hidden.includes(section.key)}
            onCheckedChange={(on) =>
              update((d) => {
                const current = d.settings.hidden_sections ?? [];
                const next = on
                  ? current.filter((s) => s !== section.key)
                  : [...current, section.key];
                return {
                  ...d,
                  settings: { ...d.settings, hidden_sections: next },
                };
              })
            }
          />
        ))}
      </div>
    </Panel>
  );
}
