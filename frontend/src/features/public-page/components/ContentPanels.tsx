import { Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { IconButton, Panel, Switch } from "@/components/ui/controls";
import { inputClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import type { PageProject, Section } from "@/public/types";
import {
  imageUrl,
  useDraftPortfolio,
  useSuggestHighlights,
  type CaseStudy,
  type ImageOut,
  type PortfolioDraft,
} from "../api";
import { portfolioOf, portfolioUpdater, type PageDraft } from "../draft";
import { CaseStudyEditor } from "./CaseStudyEditor";
import { ImagePicker } from "./ImagePicker";

type Update = (recipe: (draft: PageDraft) => PageDraft) => void;

/** "By the numbers": achievements from your profile, every number checked. */
export function HighlightsPanel({
  draft,
  update,
}: {
  draft: PageDraft;
  update: Update;
}) {
  const suggest = useSuggestHighlights();
  const highlights = draft.settings.highlights ?? [];
  const set = (next: typeof highlights) =>
    update((d) => ({ ...d, settings: { ...d.settings, highlights: next } }));

  const run = () =>
    suggest.mutate(undefined, {
      onSuccess: (found) => {
        if (!found.length) {
          toast("No numbers to lead with yet", {
            description:
              "Add results with numbers to your profile (people, money, time, percentages) and try again.",
          });
          return;
        }
        set(found);
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <Panel
      title="By the numbers"
      description="Up to four results from your profile, shown big. Every number must match a fact you wrote."
      actions={
        <Button
          size="sm"
          variant={highlights.length ? "secondary" : "primary"}
          icon={<Sparkles className="size-3.5" />}
          loading={suggest.isPending}
          onClick={run}
        >
          {highlights.length ? "Suggest again" : "Suggest from my profile"}
        </Button>
      }
    >
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
                <input
                  className={cn(inputClass, "h-10 px-3")}
                  value={highlight.label}
                  maxLength={90}
                  onChange={(event) =>
                    set(
                      highlights.map((h, i) =>
                        i === index ? { ...h, label: event.target.value } : h,
                      ),
                    )
                  }
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

/** A picture for each project, and which one leads. */
export function ProjectsPanel({
  draft,
  update,
  projects,
  onImage,
  suggestion,
  onSuggestion,
}: {
  draft: PageDraft;
  update: Update;
  projects: PageProject[];
  onImage: (image: ImageOut) => void;
  suggestion: PortfolioDraft | null;
  onSuggestion: (draft: PortfolioDraft | null) => void;
}) {
  const drafting = useDraftPortfolio();
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
  const suggested = suggestion?.case_studies ?? {};
  const setCase = (projectId: string, study: CaseStudy | null) =>
    portfolioUpdater(update)((p) => {
      const next = { ...(p.case_studies ?? {}) };
      if (study) next[projectId] = study;
      else delete next[projectId];
      return { ...p, case_studies: next };
    });

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
        <Button
          size="sm"
          variant="secondary"
          icon={<Sparkles className="size-3.5" />}
          loading={drafting.isPending}
          onClick={() =>
            drafting.mutate(["case_studies"], {
              onSuccess: (result) => {
                onSuggestion(result);
                if (!Object.keys(result.case_studies).length)
                  toast("Nothing to draft yet", {
                    description:
                      "Add details to your projects in your profile first.",
                  });
              },
              onError: (error) => toast.error(error.message),
            })
          }
        >
          Draft case studies with AI
        </Button>
      }
    >
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
                <div className="w-full rounded-control border border-chalk/40 bg-chalk-soft p-3 text-[0.875rem]">
                  <p className="font-semibold text-chalk">
                    A drafted case study is ready.
                  </p>
                  <p className="mt-1 text-ink-2">
                    {suggested[project.id]?.overview ??
                      suggested[project.id]?.problem}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        setCase(project.id, suggested[project.id] ?? null)
                      }
                    >
                      Use this
                    </Button>
                  </div>
                </div>
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
  { key: "highlights", label: "By the numbers" },
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
