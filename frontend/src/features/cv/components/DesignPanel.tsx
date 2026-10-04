import { Check } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/choice";
import { Panel, Switch } from "@/components/ui/controls";
import { ImagePicker } from "@/features/public-page/components/ImagePicker";
import { imageUrl } from "@/features/public-page/api";
import { cn } from "@/lib/cn";
import {
  ACCENTS,
  TEMPLATES,
  documentUrl,
  type Accent,
  type CvOptions,
  type CvTemplate,
} from "../api";

export interface DesignDraft {
  template: CvTemplate;
  accent: Accent;
  options: CvOptions;
}

type Update = (recipe: (draft: DesignDraft) => DesignDraft) => void;

const SECTIONS: {
  key: NonNullable<CvOptions["hidden_sections"]>[number];
  label: string;
}[] = [
  { key: "summary", label: "Profile summary" },
  { key: "experience", label: "Experience" },
  { key: "projects", label: "Projects" },
  { key: "skills", label: "Skills" },
  { key: "education", label: "Education" },
  { key: "certifications", label: "Certifications" },
  { key: "languages", label: "Languages" },
];

/** A thumbnail of your own CV in a design: the real document, small. */
function Thumbnail({
  template,
  accent,
  stamp,
}: {
  template: CvTemplate;
  accent: Accent;
  stamp: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setScale((element.clientWidth - 24) / 794),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={box}
      className="relative overflow-hidden bg-surface-2"
      style={{ height: 1123 * scale * 0.62 + 12 }}
      aria-hidden
    >
      <iframe
        src={documentUrl(stamp, { template, accent })}
        title=""
        tabIndex={-1}
        loading="lazy"
        className="pointer-events-none absolute left-3 top-3 origin-top-left bg-white shadow-sheet"
        style={{
          width: 794,
          height: 1123,
          transform: `scale(${scale})`,
          border: 0,
        }}
      />
    </div>
  );
}

export function DesignPanel({
  draft,
  update,
  stamp,
}: {
  draft: DesignDraft;
  update: Update;
  /** Changes when the words or photo change, so thumbnails redraw only then. */
  stamp: string;
}) {
  const options = draft.options;
  const setOptions = (changes: Partial<CvOptions>) =>
    update((d) => ({ ...d, options: { ...d.options, ...changes } }));
  const hidden = options.hidden_sections ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Design"
        description="Five designs, each made to print. Your words stay the same when you switch."
      >
        <div
          role="radiogroup"
          aria-label="Design"
          className="grid grid-cols-2 gap-3"
        >
          {TEMPLATES.map((template) => {
            const on = draft.template === template.key;
            return (
              <button
                key={template.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() =>
                  update((d) => ({ ...d, template: template.key }))
                }
                className={cn(
                  "overflow-hidden rounded-panel border text-left transition-[border-color,box-shadow]",
                  on
                    ? "border-ink shadow-[0_0_0_2px_var(--ink)]"
                    : "border-line-strong hover:border-ink-3",
                )}
              >
                <Thumbnail
                  template={template.key}
                  accent={draft.accent}
                  stamp={stamp}
                />
                <div className="border-t border-line bg-surface px-3 py-2.5">
                  <p className="flex items-center gap-1.5 font-semibold">
                    {template.name}
                    {on && <Check className="size-4" aria-hidden />}
                  </p>
                  <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-2">
                    {template.note}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <p className="type-label mt-6">Colour</p>
        <div
          role="radiogroup"
          aria-label="Colour"
          className="mt-2 flex flex-wrap gap-2"
        >
          {ACCENTS.map((accent) => {
            const on = draft.accent === accent.key;
            return (
              <button
                key={accent.key}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={accent.label}
                title={accent.label}
                onClick={() => update((d) => ({ ...d, accent: accent.key }))}
                className={cn(
                  "grid size-10 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-shadow",
                  on
                    ? "ring-2 ring-ink"
                    : "hover:ring-2 hover:ring-line-strong",
                )}
                style={{ background: accent.hex }}
              >
                {on && <Check className="size-4 text-white" aria-hidden />}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="Layout" description="Photo, spacing, paper and labels.">
        <div className="flex flex-wrap items-center gap-4">
          {options.photo_id ? (
            <img
              src={imageUrl(options.photo_id) ?? undefined}
              alt="Your photo"
              className="size-16 rounded-full border border-line object-cover"
            />
          ) : (
            <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-[0.75rem] text-ink-3">
              No photo
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            <ImagePicker
              purpose="avatar"
              label={options.photo_id ? "Change photo" : "Add a photo"}
              onUploaded={(image) => setOptions({ photo_id: image.id })}
            />
            {options.photo_id && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOptions({ photo_id: null })}
              >
                Remove
              </Button>
            )}
          </div>
          <p className="w-full text-[0.8125rem] text-ink-3">
            Common on Malaysian CVs; some employers prefer none. Without a
            photo, designs show your initials.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="type-label">Spacing</p>
            <div className="mt-2">
              <Segmented
                label="Spacing"
                options={[
                  { value: "comfortable", label: "Comfortable" },
                  { value: "compact", label: "Compact" },
                ]}
                value={options.density ?? "comfortable"}
                onChange={(density) => setOptions({ density })}
              />
            </div>
          </div>
          <div>
            <p className="type-label">Paper</p>
            <div className="mt-2">
              <Segmented
                label="Paper"
                options={[
                  { value: "A4", label: "A4" },
                  { value: "Letter", label: "US Letter" },
                ]}
                value={options.paper ?? "A4"}
                onChange={(paper) => setOptions({ paper })}
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <p className="type-label">Headings in</p>
          <div className="mt-2">
            <Segmented
              label="Headings in"
              options={[
                { value: "en", label: "English" },
                { value: "ms", label: "Bahasa Malaysia" },
              ]}
              value={options.language ?? "en"}
              onChange={(language) => setOptions({ language })}
            />
          </div>
          <p className="mt-1.5 text-[0.8125rem] text-ink-3">
            To translate your words too, use AI edits.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <Switch
            label="Show my email"
            checked={options.show_email !== false}
            onCheckedChange={(show_email) => setOptions({ show_email })}
          />
          <Switch
            label="Show my phone number on my downloads"
            checked={options.show_phone !== false}
            onCheckedChange={(show_phone) => setOptions({ show_phone })}
          />
          <p className="pl-[3.25rem] text-[0.8125rem] text-ink-3">
            A shared CV never shows your phone number.
          </p>
        </div>
      </Panel>

      <Panel
        title="Sections"
        description="Leave out what doesn't help this CV."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <Switch
              key={section.key}
              label={section.label}
              checked={!hidden.includes(section.key)}
              onCheckedChange={(on) =>
                setOptions({
                  hidden_sections: on
                    ? hidden.filter((s) => s !== section.key)
                    : [...hidden, section.key],
                })
              }
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}
