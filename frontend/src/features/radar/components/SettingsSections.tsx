import { Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ChipInput, Slider, ToggleChips } from "@/components/ui/choice";
import { Panel, Select, Switch } from "@/components/ui/controls";
import { FitTape } from "@/components/ui/FitTape";
import type {
  CompleteSettings,
  EmploymentType,
  RadarOptions,
  Seniority,
  WorkMode,
} from "../api";
import {
  BRIEF_TIMES,
  DAY_LABEL,
  EMPLOYMENT_LABEL,
  SENIORITY_LABEL,
  WORK_MODE_LABEL,
  formatClock,
  formatRinggit,
} from "../labels";

interface Props {
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
}: Props & { options: RadarOptions | undefined }) {
  return (
    <Panel
      id="where"
      title="Where"
      description="Tailr searches across Malaysia and keeps jobs in your chosen places."
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
      <p className="type-label mb-3 mt-6">How you want to work</p>
      <ToggleChips<WorkMode>
        label="How you want to work"
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

export function LevelSection({ settings, set }: Props) {
  return (
    <Panel id="level" title="Level and job type">
      <p className="type-label mb-3">Level</p>
      <ToggleChips<Seniority>
        label="Level"
        options={entries(SENIORITY_LABEL)}
        value={settings.seniority}
        onChange={(seniority) => set({ seniority })}
      />
      <p className="mt-2 text-[0.8125rem] text-ink-3">
        {settings.seniority.length === 0
          ? "Any level. Pick some to narrow it down."
          : "Titles without a level still count as mid-level."}
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

export function PaySection({ settings, set }: Props) {
  return (
    <Panel
      id="pay"
      title="Pay"
      description="Monthly salary in ringgit. Many Malaysian listings don't show pay at all."
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
    </Panel>
  );
}

export function DealBreakersSection({ settings, set }: Props) {
  return (
    <Panel id="deal-breakers" title="Must-haves and deal-breakers">
      <div className="flex flex-col gap-5">
        <ChipInput
          label="Must mention any of"
          value={settings.must_have}
          onChange={(must_have) => set({ must_have })}
          placeholder="Python, LLM"
          hint="Leave empty to keep every relevant job."
        />
        <ChipInput
          label="Skip jobs that mention"
          value={settings.exclude_keywords}
          onChange={(exclude_keywords) => set({ exclude_keywords })}
          placeholder="Sales, Night shift"
        />
        <ChipInput
          label="Skip these companies"
          value={settings.exclude_companies}
          onChange={(exclude_companies) => set({ exclude_companies })}
          placeholder="Your current employer"
          max={50}
        />
      </div>
    </Panel>
  );
}

export function FreshnessSection({ settings, set }: Props) {
  return (
    <Panel id="freshness" title="Freshness and fit">
      <p className="type-label mb-3">How recent</p>
      <ToggleChips<number>
        label="How recent"
        single
        options={[
          { value: 1, label: "Last 24 hours" },
          { value: 3, label: "Last 3 days" },
          { value: 7, label: "Last week" },
        ]}
        value={[settings.freshness_days]}
        onChange={([days]) =>
          days && set({ freshness_days: days as 1 | 3 | 7 })
        }
      />
      <div className="mt-7">
        <Slider
          label="Only brief me on jobs that fit at least"
          value={settings.min_fit}
          min={30}
          max={95}
          step={5}
          onChange={(min_fit) => set({ min_fit })}
          format={(value) => `${value}%`}
        />
        <div className="mt-3">
          <FitTape
            score={settings.min_fit}
            size="sm"
            animated={false}
            showLabel
          />
        </div>
      </div>
    </Panel>
  );
}

export function SourcesSection({
  settings,
  set,
  options,
}: Props & { options: RadarOptions | undefined }) {
  const toggle = (key: string, on: boolean) =>
    set({
      sources: on
        ? [...settings.sources, key]
        : settings.sources.filter((s) => s !== key),
    });
  return (
    <Panel id="sources" title="Job sites">
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

export function BriefSection({
  settings,
  set,
  nextBrief,
}: Props & { nextBrief: string | null }) {
  return (
    <Panel
      id="brief"
      title="Morning brief"
      description={
        nextBrief
          ? `Your next brief: ${nextBrief}.`
          : settings.paused
            ? "Your radar is paused."
            : undefined
      }
    >
      <div className="grid gap-6 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="brief-time" className="type-label">
            Time
          </label>
          <Select
            id="brief-time"
            value={settings.brief_time}
            onChange={(e) => set({ brief_time: e.target.value })}
          >
            {BRIEF_TIMES.map((time) => (
              <option key={time} value={time}>
                {formatClock(time)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <p className="type-label mb-3">Days</p>
          <ToggleChips<number>
            label="Days"
            options={DAY_LABEL.map((label, value) => ({ value, label }))}
            value={settings.brief_days}
            onChange={(brief_days) =>
              brief_days.length && set({ brief_days: [...brief_days].sort() })
            }
          />
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <Switch
          label="Email me the brief too"
          checked={settings.email_brief}
          onCheckedChange={(email_brief) => set({ email_brief })}
        />
        <Switch
          label="Pause my radar"
          checked={settings.paused}
          onCheckedChange={(paused) => set({ paused })}
        />
      </div>
    </Panel>
  );
}
