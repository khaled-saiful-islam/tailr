import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChipInput } from "@/components/ui/choice";
import { IconButton, Labelled, TextArea } from "@/components/ui/controls";
import { Field } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { imageUrl, type CaseStudy, type ImageOut } from "../api";
import { ImagePicker } from "./ImagePicker";

const EMPTY: CaseStudy = {
  overview: null,
  role: null,
  timeline: null,
  team: null,
  problem: null,
  approach: [],
  outcome: null,
  lessons: null,
  tools: [],
  gallery: [],
};

/** A project's story: problem, decisions, outcome, and pictures. */
export function CaseStudyEditor({
  name,
  study,
  onChange,
  onImage,
}: {
  name: string;
  study: CaseStudy | undefined;
  onChange: (study: CaseStudy | null) => void;
  onImage: (image: ImageOut) => void;
}) {
  const [open, setOpen] = useState(false);
  const value = { ...EMPTY, ...(study ?? {}) };
  const set = (changes: Partial<CaseStudy>) =>
    onChange({ ...value, ...changes });
  const text = (
    key:
      | "overview"
      | "role"
      | "timeline"
      | "team"
      | "problem"
      | "outcome"
      | "lessons",
  ) => ({
    value: value[key] ?? "",
    onChange: (event: { target: { value: string } }) =>
      set({ [key]: event.target.value || null }),
  });
  const approach = value.approach ?? [];
  const gallery = value.gallery ?? [];
  const filled = Boolean(
    value.overview || value.problem || approach.length || value.outcome,
  );

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-chalk hover:underline"
      >
        {filled ? "Edit the case study" : "Write a case study"}
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-4 rounded-control bg-surface-2 p-4">
          <Labelled label="In a sentence or two" htmlFor={`overview-${name}`}>
            <TextArea
              id={`overview-${name}`}
              maxLength={320}
              {...text("overview")}
            />
          </Labelled>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Your role" maxLength={120} {...text("role")} />
            <Field
              label="When"
              placeholder="2023 – 2024"
              maxLength={60}
              {...text("timeline")}
            />
            <Field
              label="Team"
              placeholder="4 engineers"
              maxLength={80}
              {...text("team")}
            />
          </div>
          <Labelled label="The problem" htmlFor={`problem-${name}`}>
            <TextArea
              id={`problem-${name}`}
              maxLength={900}
              {...text("problem")}
            />
          </Labelled>
          <div className="flex flex-col gap-2">
            <p className="type-label">
              The approach: key decisions and their trade-offs
            </p>
            {approach.map((step, index) => (
              <div key={index} className="flex gap-2">
                <TextArea
                  aria-label={`Decision ${index + 1}`}
                  className="flex-1"
                  maxLength={400}
                  value={step}
                  onChange={(event) =>
                    set({
                      approach: approach.map((s, i) =>
                        i === index ? event.target.value : s,
                      ),
                    })
                  }
                />
                <IconButton
                  label={`Remove decision ${index + 1}`}
                  tone="danger"
                  onClick={() =>
                    set({ approach: approach.filter((_, i) => i !== index) })
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                </IconButton>
              </div>
            ))}
            {approach.length < 5 && (
              <Button
                size="sm"
                variant="ghost"
                icon={<Plus className="size-3.5" />}
                className="self-start"
                onClick={() => set({ approach: [...approach, ""] })}
              >
                Add a decision
              </Button>
            )}
          </div>
          <Labelled
            label="The outcome"
            htmlFor={`outcome-${name}`}
            hint="Numbers only if they're in your profile."
          >
            <TextArea
              id={`outcome-${name}`}
              maxLength={700}
              {...text("outcome")}
            />
          </Labelled>
          <Labelled
            label="What you learned (optional)"
            htmlFor={`lessons-${name}`}
          >
            <TextArea
              id={`lessons-${name}`}
              maxLength={450}
              {...text("lessons")}
            />
          </Labelled>
          <ChipInput
            label="Tools"
            value={value.tools ?? []}
            onChange={(tools) => set({ tools })}
            max={10}
          />
          <div>
            <p className="type-label">More pictures</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {gallery.map((id) => (
                <span key={id} className="relative">
                  <img
                    src={imageUrl(id) ?? undefined}
                    alt=""
                    className="h-16 w-24 rounded-[6px] border border-line object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove picture"
                    onClick={() =>
                      set({ gallery: gallery.filter((g) => g !== id) })
                    }
                    className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-surface text-pin shadow-sheet"
                  >
                    <Trash2 className="size-3" aria-hidden />
                  </button>
                </span>
              ))}
              {gallery.length < 6 && (
                <ImagePicker
                  purpose="project"
                  label="Add a picture"
                  onUploaded={(image) => {
                    onImage(image);
                    set({ gallery: [...gallery, image.id] });
                  }}
                />
              )}
            </div>
          </div>
          {filled && (
            <Button
              size="sm"
              variant="ghost"
              className="self-start text-pin"
              onClick={() => onChange(null)}
            >
              Clear the case study
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
