import { Sparkles, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { IconButton, Panel, TextArea } from "@/components/ui/controls";
import { Field } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { removeById, updateById } from "@/lib/list";
import { useWriteSummary } from "../../api";
import { newId } from "../../types";
import { TextField } from "../editor/primitives";
import type { SectionProps } from "./types";

export function BasicsSection({ doc, update }: SectionProps) {
  const basics = doc.basics;
  const set = (patch: Partial<typeof basics>) =>
    update((d) => ({ ...d, basics: { ...d.basics, ...patch } }));

  return (
    <Panel
      id="basics"
      title="About you"
      description="How employers will see and reach you."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Full name"
          value={basics.full_name}
          onChange={(v) => set({ full_name: v })}
          autoComplete="name"
        />
        <TextField
          label="Headline"
          value={basics.headline}
          onChange={(v) => set({ headline: v })}
          placeholder="AI Engineer building search and chat products"
        />
        <TextField
          label="Email"
          type="email"
          value={basics.email}
          onChange={(v) => set({ email: v })}
          autoComplete="email"
        />
        <TextField
          label="Phone"
          type="tel"
          value={basics.phone}
          onChange={(v) => set({ phone: v })}
          autoComplete="tel"
        />
        <TextField
          label="Location"
          value={basics.location}
          onChange={(v) => set({ location: v })}
          placeholder="Kuala Lumpur, Malaysia"
          className="sm:col-span-2"
        />
      </div>

      <div className="mt-6">
        <p className="type-label">Links</p>
        <ul className="mt-2 flex flex-col gap-2">
          {basics.links.map((link, index) => (
            <li
              key={link.id}
              className={cn(
                "grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-end gap-2",
                // Column labels once, on the first row.
                index > 0 && "[&_label]:sr-only",
              )}
            >
              <Field
                label="Label"
                value={link.label}
                onChange={(e) =>
                  set({
                    links: updateById(basics.links, link.id, {
                      label: e.target.value,
                    }),
                  })
                }
                placeholder="LinkedIn"
              />
              <Field
                label="Address"
                value={link.url}
                onChange={(e) =>
                  set({
                    links: updateById(basics.links, link.id, {
                      url: e.target.value,
                    }),
                  })
                }
                placeholder="linkedin.com/in/you"
              />
              <IconButton
                label="Remove link"
                tone="danger"
                className="mb-1"
                onClick={() =>
                  set({ links: removeById(basics.links, link.id) })
                }
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            set({
              links: [...basics.links, { id: newId(), label: "", url: "" }],
            })
          }
          className="mt-2 rounded-[8px] px-2 py-1.5 text-[0.9375rem] font-semibold text-chalk hover:bg-chalk-soft"
        >
          + Add a link
        </button>
      </div>
    </Panel>
  );
}

export function SummarySection({ doc, update }: SectionProps) {
  const writer = useWriteSummary();
  const draft = writer.result;
  const summary = doc.basics.summary ?? "";
  const words = summary.trim() ? summary.trim().split(/\s+/).length : 0;
  const setSummary = (value: string) =>
    update((d) => ({ ...d, basics: { ...d.basics, summary: value } }));

  return (
    <Panel
      id="summary"
      title="Summary"
      description="Two or three sentences at the top of your resume."
      actions={
        <Button
          size="sm"
          variant="secondary"
          icon={<Sparkles className="size-4" />}
          loading={writer.running}
          onClick={() => writer.run()}
        >
          {writer.running ? "Writing…" : "Write it for me"}
        </Button>
      }
    >
      <TextArea
        aria-label="Summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="AI engineer with six years of experience building…"
        className="min-h-28"
      />
      <p
        className={
          words > 0 && (words < 20 || words > 140)
            ? "mt-2 text-[0.8125rem] text-fit-stretch"
            : "mt-2 text-[0.8125rem] text-ink-3"
        }
      >
        {words} {words === 1 ? "word" : "words"}. Aim for 40 to 80.
      </p>
      {writer.running && (
        <p role="status" className="mt-3 text-[0.9375rem] text-ink-2">
          Writing your summary from your profile… You can keep editing.
        </p>
      )}
      {writer.error && (
        <p role="alert" className="mt-3 text-[0.9375rem] text-pin">
          {writer.error}
        </p>
      )}
      <AnimatePresence>
        {draft && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 rounded-[12px] border border-chalk/30 bg-chalk-soft/50 p-4"
          >
            <p className="type-label text-chalk">
              Tailr wrote this from your profile
            </p>
            <p className="chalk-mark mt-2 leading-relaxed">{draft.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setSummary(draft.summary);
                  writer.dismiss();
                }}
              >
                Use this
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => writer.run()}
              >
                Write another
              </Button>
              <Button size="sm" variant="ghost" onClick={writer.dismiss}>
                Keep mine
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}
