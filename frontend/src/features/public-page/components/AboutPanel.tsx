import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/choice";
import { Panel, Switch } from "@/components/ui/controls";
import { Field } from "@/components/ui/Field";
import { initials } from "@/lib/format";
import { imageUrl, type ImageOut } from "../api";
import type { PageDraft } from "../draft";
import { ImagePicker } from "./ImagePicker";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Props {
  draft: PageDraft;
  name: string;
  update: (recipe: (draft: PageDraft) => PageDraft) => void;
  onImage: (image: ImageOut) => void;
}

/** Photo, what you're open to, and how people reach you. */
export function AboutPanel({ draft, name, update, onImage }: Props) {
  const settings = draft.settings;
  const set = (changes: Partial<PageDraft["settings"]>) =>
    update((d) => ({ ...d, settings: { ...d.settings, ...changes } }));

  return (
    <Panel title="About you" description="What visitors see first.">
      <div className="flex flex-wrap items-center gap-4">
        {settings.photo_id ? (
          <img
            src={imageUrl(settings.photo_id) ?? undefined}
            alt="Your photo"
            className="size-20 rounded-full border border-line object-cover"
          />
        ) : (
          <span className="grid size-20 place-items-center rounded-full bg-surface-2 text-[1.5rem] font-bold text-ink-2">
            {initials(name || "You")}
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <ImagePicker
            purpose="avatar"
            label={settings.photo_id ? "Change photo" : "Add a photo"}
            onUploaded={(image) => {
              onImage(image);
              set({ photo_id: image.id });
            }}
          />
          {settings.photo_id && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => set({ photo_id: null })}
            >
              Remove
            </Button>
          )}
        </div>
        <p className="w-full text-[0.8125rem] text-ink-3">
          A clear head-and-shoulders photo works best. Location data in the file
          is removed.
        </p>
      </div>

      <div className="mt-6">
        <p className="type-label">Are you looking?</p>
        <div className="mt-2">
          <Segmented
            label="Are you looking?"
            options={[
              { value: "open", label: "Open to new roles" },
              { value: "casual", label: "Open to the right role" },
              { value: "not_looking", label: "Not looking" },
            ]}
            value={settings.availability ?? "open"}
            onChange={(availability) => set({ availability })}
          />
        </div>
      </div>
      {settings.availability !== "not_looking" && (
        <Field
          className="mt-4"
          label="What you're looking for (optional)"
          placeholder="AI engineering roles in KL or remote"
          maxLength={120}
          value={settings.availability_note ?? ""}
          onChange={(event) =>
            set({ availability_note: event.target.value || null })
          }
        />
      )}

      <ContactEmail
        value={settings.contact_email ?? null}
        onChange={(contact_email) => set({ contact_email })}
      />

      <div className="mt-5">
        <Switch
          label="Show my city"
          checked={settings.show_location !== false}
          onCheckedChange={(show_location) => set({ show_location })}
        />
        <p className="mt-1.5 pl-[3.25rem] text-[0.8125rem] text-ink-3">
          Only the city and state; never a street address.
        </p>
      </div>
    </Panel>
  );
}

/** Saved only once it looks like an email address; empty means no Contact button. */
function ContactEmail({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [text, setText] = useState(value ?? "");
  const [touched, setTouched] = useState(false);
  useEffect(() => setText(value ?? ""), [value]);
  const trimmed = text.trim();
  const valid = !trimmed || EMAIL.test(trimmed);
  return (
    <Field
      className="mt-5"
      type="email"
      inputMode="email"
      autoComplete="email"
      label="Contact email (optional)"
      placeholder="you@example.com"
      value={text}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        const clean = next.trim();
        if (!clean) onChange(null);
        else if (EMAIL.test(clean)) onChange(clean);
      }}
      onBlur={() => setTouched(true)}
      error={
        touched && !valid
          ? "That doesn't look like an email address."
          : undefined
      }
      hint="Adds an 'Email me' button. The address is shown only when a visitor clicks it, so it can't be scraped from the page. It can differ from your sign-in email."
    />
  );
}
