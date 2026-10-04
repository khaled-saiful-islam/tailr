import { Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ChipInput, Slider, ToggleChips } from "@/components/ui/choice";
import { Panel, Switch } from "@/components/ui/controls";
import type {
  CompleteSettings,
  EmploymentType,
  RadarOptions,
  Seniority,
  WorkMode,
} from "../api";
import {
  EMPLOYMENT_LABEL,
  SENIORITY_LABEL,
  WORK_MODE_LABEL,
  formatRinggit,
} from "../labels";

export interface SectionProps {
  settings: CompleteSettings;
  set: (patch: Partial<CompleteSettings>) => void;
}

const entries = <K extends string>(labels: Record<K, string>) =>
  (Object.entries(labels) as [K, string][]).map(([value, label]) => ({
    value,
    label,
  }));

export function WhereSection({
  settings,
  set,
  options,
}: SectionProps & { options: RadarOptions | undefined }) {
  return (
    <Panel
      id="where"
      title="Where?"
      description="Tailr searches all of Malaysia, then keeps jobs in the places you pick."
    >
      <Switch
        label="Anywhere in Malaysia"
        checked={settings.anywhere}
        onCheckedChange={(anywhere) => set({ anywhere })}
      />
      <AnimatePresence initial={false}>
        {!settings.anywhere && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="type-label mt-5">Places</p>
            <p className="mb-3 text-[0.8125rem] text-ink-3">
              A state includes its cities: Selangor covers Petaling Jaya,
              Cyberjaya, Shah Alam and more.
            </p>
            <ToggleChips
              label="Places"
              options={(options?.places ?? []).map((p) => ({
                value: p.key,
                label: p.label,
              }))}
              value={settings.places}
              onChange={(places) => set({ places })}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <p className="type-label mb-3 mt-6">Remote, hybrid or on-site</p>
      <ToggleChips<WorkMode>
        label="Remote, hybrid or on-site"
        options={entries(WORK_MODE_LABEL)}
        value={settings.work_modes}
        onChange={(work_modes) => work_modes.length && set({ work_modes })}
      />
      {!settings.anywhere && settings.work_modes.includes("remote") && (
        <p className="mt-3 text-[0.8125rem] text-ink-3">
          Remote jobs anywhere in Malaysia are always included.
        </p>
      )}
    </Panel>
  );
}

export function PayAndTypeSection({ settings, set }: SectionProps) {
  return (
    <Panel
      id="pay"
      title="Pay and job type"
      description="Monthly salary in ringgit. Many Malaysian job ads don't show pay at all."
    >
      <Slider
        label="Lowest monthly salary"
        value={settings.salary_min ?? 0}
        min={0}
        max={30000}
        step={500}
        onChange={(value) => set({ salary_min: value || null })}
        format={(value) => formatRinggit(value || null)}
      />
      <div className="mt-6">
        <Switch
          label="Include jobs that don't show a salary"
          checked={settings.include_no_salary}
          onCheckedChange={(include_no_salary) => set({ include_no_salary })}
        />
      </div>
      <p className="type-label mb-3 mt-7">Level</p>
      <ToggleChips<Seniority>
        label="Level"
        options={entries(SENIORITY_LABEL)}
        value={settings.seniority}
        onChange={(seniority) => set({ seniority })}
      />
      <p className="mt-2 text-[0.8125rem] text-ink-3">
        {settings.seniority.length === 0
          ? "Any level. Pick some to narrow it down."
          : "Job titles without a level count as mid-level."}
      </p>
      <p className="type-label mb-3 mt-6">Job type</p>
      <ToggleChips<EmploymentType>
        label="Job type"
        options={entries(EMPLOYMENT_LABEL)}
        value={settings.employment_types}
        onChange={(employment_types) =>
          employment_types.length && set({ employment_types })
        }
      />
    </Panel>
  );
}

export function LeaveOutSection({ settings, set }: SectionProps) {
  return (
    <Panel
      id="leave-out"
      title="Leave out"
      description="Jobs that mention these words, or come from these companies, are skipped."
    >
      <div className="flex flex-col gap-5">
        <ChipInput
          label="Words"
          value={settings.exclude_keywords}
          onChange={(exclude_keywords) => set({ exclude_keywords })}
          placeholder="Sales, Night shift"
          hint="Press Enter after each one."
        />
        <ChipInput
          label="Companies"
          value={settings.exclude_companies}
          onChange={(exclude_companies) => set({ exclude_companies })}
          placeholder="Your current employer"
          max={50}
        />
      </div>
    </Panel>
  );
}

export function SourcesSection({
  settings,
  set,
  options,
}: SectionProps & { options: RadarOptions | undefined }) {
  const toggle = (key: string, on: boolean) =>
    set({
      sources: on
        ? [...settings.sources, key]
        : settings.sources.filter((s) => s !== key),
    });
  return (
    <Panel
      id="sources"
      title="Job sites"
      description="Where Tailr looks for jobs."
    >
      <ul className="flex flex-col gap-4">
        {(options?.sources ?? []).map((source) => (
          <li
            key={source.key}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
          >
            {source.available ? (
              <Switch
                label={source.label}
                checked={settings.sources.includes(source.key)}
                onCheckedChange={(on) => toggle(source.key, on)}
              />
            ) : (
              <span className="flex items-center gap-2.5 text-ink-3">
                <span className="grid h-6 w-10 place-items-center rounded-full bg-surface-2">
                  <Lock className="size-3.5" aria-hidden />
                </span>
                {source.label}
              </span>
            )}
            {source.note && (
              <span className="text-[0.8125rem] text-ink-3">{source.note}</span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
