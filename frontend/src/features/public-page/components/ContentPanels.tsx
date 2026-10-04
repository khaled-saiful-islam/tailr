import { Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { IconButton, Panel, Switch } from "@/components/ui/controls";
import { inputClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import type { PageProject, Section } from "@/public/types";
import { imageUrl, useSuggestHighlights, type ImageOut } from "../api";
import type { PageDraft } from "../draft";
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
}: {
  draft: PageDraft;
  update: Update;
  projects: PageProject[];
  onImage: (image: ImageOut) => void;
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
      description="Add a picture to each and choose one to lead. Screenshots, photos or diagrams all work."
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
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

const SECTIONS: { key: Section; label: string }[] = [
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
