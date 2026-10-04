import { Slider, ToggleChips } from "@/components/ui/choice";
import { Panel, Select, Switch } from "@/components/ui/controls";
import { FitTape } from "@/components/ui/FitTape";
import { BRIEF_TIMES, DAY_LABEL, formatClock } from "../labels";
import type { SectionProps } from "./SettingsSections";

/** When Tailr searches, how far back, and whether it emails you. */
export function DailyUpdateSection({
  settings,
  set,
  nextUpdate,
}: SectionProps & { nextUpdate: string | null }) {
  return (
    <Panel
      id="daily-update"
      title="Daily job update"
      description={
        settings.paused
          ? "Paused: Tailr won't search until you turn this back on."
          : nextUpdate
            ? `Tailr searches LinkedIn and JobStreet at this time and adds new jobs to your Jobs page. Next update: ${nextUpdate}.`
            : "Tailr searches LinkedIn and JobStreet at this time and adds new jobs to your Jobs page."
      }
    >
      <div className="grid gap-6 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="update-time" className="type-label">
            Time
          </label>
          <Select
            id="update-time"
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
      <p className="type-label mb-3 mt-6">Only jobs posted in the</p>
      <ToggleChips<number>
        label="Only jobs posted in the"
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
      <div className="mt-6 flex flex-col gap-4">
        <Switch
          label="Email me the update"
          checked={settings.email_brief}
          onCheckedChange={(email_brief) => set({ email_brief })}
        />
        <Switch
          label="Pause the daily update"
          checked={settings.paused}
          onCheckedChange={(paused) => set({ paused })}
        />
      </div>
    </Panel>
  );
}

/** The line between "good matches" and the rest of the Jobs page. */
export function MinimumMatchSection({ settings, set }: SectionProps) {
  return (
    <Panel
      id="minimum-match"
      title="Minimum match"
      description="Jobs at or above this are your good matches. The rest still show, lower on the Jobs page."
    >
      <Slider
        label="Minimum match"
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
    </Panel>
  );
}
