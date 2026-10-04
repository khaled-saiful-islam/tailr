import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/choice";
import {
  IconButton,
  Labelled,
  Panel,
  Switch,
  TextArea,
} from "@/components/ui/controls";
import { Field } from "@/components/ui/Field";
import type { PortfolioContent } from "../api";
import type { PortfolioUpdate } from "../draft";

interface Props {
  portfolio: PortfolioContent;
  update: PortfolioUpdate;
}

/** Awards and recognition the owner enters (certifications come from the profile). */
export function AwardsPanel({ portfolio, update }: Props) {
  const awards = portfolio.awards ?? [];
  const set = (index: number, changes: Partial<(typeof awards)[number]>) =>
    update((p) => ({
      ...p,
      awards: (p.awards ?? []).map((a, i) =>
        i === index ? { ...a, ...changes } : a,
      ),
    }));
  return (
    <Panel
      title="Awards"
      description="Prizes, scholarships, Dean's List, hackathons. Certifications from your profile show too."
    >
      <div className="flex flex-col gap-4">
        {awards.map((award, index) => (
          <div key={index} className="rounded-control border border-line p-4">
            <div className="flex items-start gap-2">
              <Field
                className="flex-1"
                label="Award"
                maxLength={120}
                value={award.title}
                onChange={(e) => set(index, { title: e.target.value })}
              />
              <IconButton
                label={`Remove ${award.title || "award"}`}
                tone="danger"
                className="mt-7"
                onClick={() =>
                  update((p) => ({
                    ...p,
                    awards: (p.awards ?? []).filter((_, i) => i !== index),
                  }))
                }
              >
                <Trash2 className="size-4" aria-hidden />
              </IconButton>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
              <Field
                label="From (optional)"
                maxLength={120}
                value={award.issuer ?? ""}
                onChange={(e) => set(index, { issuer: e.target.value || null })}
              />
              <Field
                label="Year"
                inputMode="numeric"
                maxLength={4}
                value={award.year ? String(award.year) : ""}
                onChange={(e) => {
                  const year = Number(e.target.value.replace(/\D/g, ""));
                  set(index, {
                    year: year >= 1950 && year <= 2100 ? year : null,
                  });
                }}
              />
            </div>
            <Field
              className="mt-3"
              label="What it was for (optional)"
              maxLength={220}
              value={award.detail ?? ""}
              onChange={(e) => set(index, { detail: e.target.value || null })}
            />
          </div>
        ))}
        {awards.length < 8 && (
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus className="size-3.5" />}
            className="self-start"
            onClick={() =>
              update((p) => ({
                ...p,
                awards: [
                  ...(p.awards ?? []),
                  {
                    title: "New award",
                    issuer: null,
                    year: null,
                    detail: null,
                  },
                ],
              }))
            }
          >
            Add an award
          </Button>
        )}
      </div>
    </Panel>
  );
}

/** Real recommendations only: Tailr never writes these. */
export function TestimonialsPanel({ portfolio, update }: Props) {
  const items = portfolio.testimonials ?? [];
  const set = (index: number, changes: Partial<(typeof items)[number]>) =>
    update((p) => ({
      ...p,
      testimonials: (p.testimonials ?? []).map((t, i) =>
        i === index ? { ...t, ...changes } : t,
      ),
    }));
  return (
    <Panel
      title="What people say"
      description="Up to three short recommendations, copied from LinkedIn or a reference, with permission. Only real ones."
    >
      <div className="flex flex-col gap-4">
        {items.map((item, index) => (
          <div key={index} className="rounded-control border border-line p-4">
            <div className="flex items-start gap-2">
              <Labelled
                label="Quote"
                htmlFor={`quote-${index}`}
                className="flex-1"
              >
                <TextArea
                  id={`quote-${index}`}
                  maxLength={420}
                  value={item.quote}
                  onChange={(e) => set(index, { quote: e.target.value })}
                />
              </Labelled>
              <IconButton
                label={`Remove the quote from ${item.name || "this person"}`}
                tone="danger"
                className="mt-7"
                onClick={() =>
                  update((p) => ({
                    ...p,
                    testimonials: (p.testimonials ?? []).filter(
                      (_, i) => i !== index,
                    ),
                  }))
                }
              >
                <Trash2 className="size-4" aria-hidden />
              </IconButton>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field
                label="Their name"
                maxLength={80}
                value={item.name}
                onChange={(e) => set(index, { name: e.target.value })}
              />
              <Field
                label="Their role (optional)"
                maxLength={120}
                value={item.role ?? ""}
                onChange={(e) => set(index, { role: e.target.value || null })}
              />
            </div>
            <Field
              className="mt-3"
              label="How you know them (optional)"
              placeholder="Managed me at Selat Pay"
              maxLength={120}
              value={item.relationship ?? ""}
              onChange={(e) =>
                set(index, { relationship: e.target.value || null })
              }
            />
          </div>
        ))}
        {items.length < 3 && (
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus className="size-3.5" />}
            className="self-start"
            onClick={() =>
              update((p) => ({
                ...p,
                testimonials: [
                  ...(p.testimonials ?? []),
                  { quote: "", name: "", role: null, relationship: null },
                ],
              }))
            }
          >
            Add a recommendation
          </Button>
        )}
      </div>
    </Panel>
  );
}

/** One page or several, and how visitors get in touch. */
export function SitePanel({ portfolio, update }: Props) {
  return (
    <Panel
      title="Pages and contact"
      description="How the site is laid out, and how people reach you."
    >
      <p className="type-label">Pages</p>
      <div className="mt-2">
        <Segmented
          label="Pages"
          options={[
            { value: "one_page", label: "One page" },
            { value: "multi_page", label: "Several pages" },
          ]}
          value={portfolio.layout ?? "one_page"}
          onChange={(layout) => update((p) => ({ ...p, layout }))}
        />
      </div>
      <p className="mt-2 text-[0.8125rem] text-ink-3">
        One page suits a shorter career; several pages (Home, About, Work,
        Contact) suit more work to show. Every project gets its own page either
        way.
      </p>
      <div className="mt-5">
        <Switch
          label="Contact form"
          checked={portfolio.contact_form !== false}
          onCheckedChange={(contact_form) =>
            update((p) => ({ ...p, contact_form }))
          }
        />
        <p className="mt-1.5 pl-[3.25rem] text-[0.8125rem] text-ink-3">
          Messages come to your email and your Tailr inbox. Your address stays
          private until you reply.
        </p>
      </div>
      <Field
        className="mt-5"
        label="WhatsApp (optional)"
        inputMode="tel"
        placeholder="+60 12 345 6789"
        maxLength={20}
        value={portfolio.whatsapp ?? ""}
        onChange={(event) => {
          const value = event.target.value.replace(/[^\d+ ]/g, "");
          update((p) => ({ ...p, whatsapp: value || null }));
        }}
        hint="Adds a 'Chat on WhatsApp' button. This shows your number to visitors."
      />
    </Panel>
  );
}
