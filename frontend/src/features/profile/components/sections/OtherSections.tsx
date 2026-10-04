import { Trash2 } from "lucide-react";
import { useState } from "react";
import { IconButton, Panel, Select } from "@/components/ui/controls";
import { Field } from "@/components/ui/Field";
import { moveById, removeById, updateById } from "@/lib/list";
import {
  emptyCertification,
  emptyEducation,
  emptyLanguage,
  formatYearMonth,
  languageLevelLabel,
  type Certification,
  type Education,
  type Language,
  type LanguageLevel,
} from "../../types";
import { AddButton, EmptyHint, ItemCard, MonthField, TextField } from "../editor/primitives";
import type { SectionProps } from "./types";

const yearValue = (value: number | null) => (value ? String(value) : "");
const toYear = (value: string) => {
  const year = Number.parseInt(value, 10);
  return Number.isFinite(year) && year > 1900 && year < 2200 ? year : null;
};

export function EducationSection({ doc, update }: SectionProps) {
  const [opened, setOpened] = useState<string | null>(null);
  const items = doc.education;
  const set = (education: Education[]) => update((d) => ({ ...d, education }));
  const patch = (id: string, value: Partial<Education>) => set(updateById(items, id, value));

  return (
    <Panel id="education" title="Education" description="Your highest qualification first.">
      {items.length === 0 && <EmptyHint>Add your degree, diploma or SPM/STPM.</EmptyHint>}
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <ItemCard
            key={item.id}
            title={[item.qualification, item.field].filter(Boolean).join(", ") || item.institution}
            subtitle={item.qualification || item.field ? item.institution : undefined}
            meta={[item.start_year, item.end_year].filter(Boolean).join(" – ")}
            defaultOpen={opened === item.id}
            onMoveUp={index > 0 ? () => set(moveById(items, item.id, -1)) : undefined}
            onMoveDown={index < items.length - 1 ? () => set(moveById(items, item.id, 1)) : undefined}
            onRemove={() => set(removeById(items, item.id))}
            removeLabel="Remove qualification"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="School or university" value={item.institution} required onChange={(v) => patch(item.id, { institution: v })} className="sm:col-span-2" />
              <TextField label="Qualification" value={item.qualification} placeholder="BSc, Diploma, STPM" onChange={(v) => patch(item.id, { qualification: v })} />
              <TextField label="Field of study" value={item.field} onChange={(v) => patch(item.id, { field: v })} />
              <Field label="Start year" inputMode="numeric" value={yearValue(item.start_year)} onChange={(e) => patch(item.id, { start_year: toYear(e.target.value) })} />
              <Field label="End year" inputMode="numeric" value={yearValue(item.end_year)} onChange={(e) => patch(item.id, { end_year: toYear(e.target.value) })} />
              <TextField label="Result" value={item.grade} placeholder="First Class Honours, CGPA 3.7" onChange={(v) => patch(item.id, { grade: v })} className="sm:col-span-2" />
            </div>
          </ItemCard>
        ))}
        <AddButton
          onClick={() => {
            const fresh = emptyEducation();
            set([...items, fresh]);
            setOpened(fresh.id);
          }}
        >
          Add a qualification
        </AddButton>
      </div>
    </Panel>
  );
}

export function CertificationsSection({ doc, update }: SectionProps) {
  const [opened, setOpened] = useState<string | null>(null);
  const items = doc.certifications;
  const set = (certifications: Certification[]) => update((d) => ({ ...d, certifications }));
  const patch = (id: string, value: Partial<Certification>) => set(updateById(items, id, value));

  return (
    <Panel id="certifications" title="Certifications">
      {items.length === 0 && <EmptyHint>Professional certificates and licences, if you have any.</EmptyHint>}
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            title={item.name}
            subtitle={item.issuer ?? undefined}
            meta={formatYearMonth(item.issued)}
            defaultOpen={opened === item.id}
            onRemove={() => set(removeById(items, item.id))}
            removeLabel="Remove certification"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Certificate" value={item.name} required onChange={(v) => patch(item.id, { name: v })} className="sm:col-span-2" />
              <TextField label="Issued by" value={item.issuer} onChange={(v) => patch(item.id, { issuer: v })} />
              <MonthField label="Issued" value={item.issued} onChange={(v) => patch(item.id, { issued: v })} />
              <TextField label="Credential link" value={item.url} onChange={(v) => patch(item.id, { url: v })} className="sm:col-span-2" />
            </div>
          </ItemCard>
        ))}
        <AddButton
          onClick={() => {
            const fresh = emptyCertification();
            set([...items, fresh]);
            setOpened(fresh.id);
          }}
        >
          Add a certification
        </AddButton>
      </div>
    </Panel>
  );
}

export function LanguagesSection({ doc, update }: SectionProps) {
  const items = doc.languages;
  const set = (languages: Language[]) => update((d) => ({ ...d, languages }));
  return (
    <Panel id="languages" title="Languages" description="Many Malaysian employers look for English, Bahasa Malaysia and Mandarin.">
      {items.length === 0 && <EmptyHint>Add the languages you speak.</EmptyHint>}
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,11rem)_auto] items-end gap-2">
            <Field label="Language" value={item.name} onChange={(e) => set(updateById(items, item.id, { name: e.target.value }))} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`level-${item.id}`} className="type-label">
                Level
              </label>
              <Select
                id={`level-${item.id}`}
                value={item.proficiency ?? ""}
                onChange={(e) => set(updateById(items, item.id, { proficiency: (e.target.value || null) as LanguageLevel | null }))}
              >
                <option value="">Not specified</option>
                {Object.entries(languageLevelLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <IconButton label={`Remove ${item.name || "language"}`} tone="danger" className="mb-1" onClick={() => set(removeById(items, item.id))}>
              <Trash2 className="size-4" />
            </IconButton>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <AddButton onClick={() => set([...items, emptyLanguage()])}>Add a language</AddButton>
      </div>
    </Panel>
  );
}
